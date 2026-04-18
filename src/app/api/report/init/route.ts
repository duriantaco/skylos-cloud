import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  getReportSupabaseAdmin,
  resolveReportProject,
} from "@/app/api/report/shared";
import {
  REPORT_UPLOAD_BUCKET,
  REPORT_UPLOAD_PROTOCOL_VERSION,
  REPORT_UPLOAD_SESSION_TTL_HOURS,
  StoredReportArtifactManifest,
  buildStoredReportArtifacts,
  normalizeReportArtifacts,
} from "@/lib/report-upload-core";

type InitSessionRow = {
  id: string;
  project_id: string;
  idempotency_key: string | null;
  status: string;
  expires_at: string | null;
  artifact_manifest: Record<string, StoredReportArtifactManifest> | null;
};

async function ensureReportUploadBucket(
  supabase: NonNullable<ReturnType<typeof getReportSupabaseAdmin>>,
) {
  const { data, error } = await supabase.storage.getBucket(REPORT_UPLOAD_BUCKET);
  if (data && !error) {
    return;
  }

  const create = await supabase.storage.createBucket(REPORT_UPLOAD_BUCKET, {
    public: false,
    fileSizeLimit: 100 * 1024 * 1024,
    allowedMimeTypes: ["application/json"],
  });
  if (create.error) {
    const message = String(create.error.message || "");
    if (!/already exists|duplicate/i.test(message)) {
      throw new Error(`Failed to prepare upload bucket: ${message}`);
    }
  }
}

function readIdempotencyKey(body: Record<string, unknown>): string | null {
  const raw = body.idempotency_key;
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function canonicalizeArtifacts(
  artifacts: Record<string, StoredReportArtifactManifest>,
): string {
  const ordered = Object.entries(artifacts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([artifactName, manifest]) => [
      artifactName,
      Object.entries(manifest)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, value]),
    ]);
  return JSON.stringify(ordered);
}

async function loadSessionByIdempotencyKey(
  supabase: NonNullable<ReturnType<typeof getReportSupabaseAdmin>>,
  projectId: string,
  idempotencyKey: string,
) {
  const { data, error } = await supabase
    .from("report_upload_sessions")
    .select("id, project_id, idempotency_key, status, expires_at, artifact_manifest")
    .eq("project_id", projectId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle<InitSessionRow>();

  if (error) {
    throw new Error(`Failed to load upload session: ${error.message}`);
  }

  return data;
}

async function buildInitArtifactsResponse(
  supabase: NonNullable<ReturnType<typeof getReportSupabaseAdmin>>,
  storedArtifacts: Record<string, StoredReportArtifactManifest>,
) {
  const responseArtifacts: Record<string, unknown> = {};
  for (const [artifactName, manifest] of Object.entries(storedArtifacts)) {
    const signed = await supabase.storage
      .from(REPORT_UPLOAD_BUCKET)
      .createSignedUploadUrl(manifest.storage_path, {
        upsert: true,
      });

    if (signed.error || !signed.data?.signedUrl) {
      throw new Error(
        `Failed to create upload URL for ${artifactName}: ${signed.error?.message || "unknown error"}`,
      );
    }

    responseArtifacts[artifactName] = {
      artifact_id: artifactName,
      key: manifest.storage_path,
      upload: {
        method: "PUT",
        url: signed.data.signedUrl,
        headers: {
          "x-upsert": "true",
        },
        accepted_statuses: [200],
      },
    };
  }
  return responseArtifacts;
}

export async function POST(req: Request) {
  const supabase = getReportSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }

  const { project, response } = await resolveReportProject(req, supabase);
  if (response) {
    return response;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (body.upload_protocol_version !== REPORT_UPLOAD_PROTOCOL_VERSION) {
    return NextResponse.json(
      {
        error: `Unsupported upload protocol version. Expected ${REPORT_UPLOAD_PROTOCOL_VERSION}.`,
      },
      { status: 400 },
    );
  }

  try {
    const artifactManifest = normalizeReportArtifacts(body.artifacts);
    const idempotencyKey = readIdempotencyKey(body as Record<string, unknown>);

    await ensureReportUploadBucket(supabase);

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + REPORT_UPLOAD_SESSION_TTL_HOURS * 60 * 60 * 1000,
    );

    if (idempotencyKey) {
      const existing = await loadSessionByIdempotencyKey(
        supabase,
        project!.id,
        idempotencyKey,
      );
      if (existing) {
        const manifestRecord = existing.artifact_manifest || {};
        const existingArtifacts = manifestRecord as Record<
          string,
          StoredReportArtifactManifest
        >;
        const expectedArtifacts = buildStoredReportArtifacts(
          project!.id,
          existing.id,
          artifactManifest,
        );

        if (
          canonicalizeArtifacts(existingArtifacts) !==
          canonicalizeArtifacts(expectedArtifacts)
        ) {
          return NextResponse.json(
            {
              error:
                "Idempotency key already exists for a different upload payload.",
            },
            { status: 409 },
          );
        }

        if (
          existing.status !== "completed" &&
          existing.expires_at &&
          Date.parse(existing.expires_at) <= now.getTime()
        ) {
          const { error: refreshError } = await supabase
            .from("report_upload_sessions")
            .update({
              upload_protocol_version: REPORT_UPLOAD_PROTOCOL_VERSION,
              status: "initialized",
              init_payload: body,
              artifact_manifest: expectedArtifacts,
              lease_id: null,
              lease_expires_at: null,
              complete_response: null,
              scan_id: null,
              completed_at: null,
              updated_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
            })
            .eq("id", existing.id)
            .eq("project_id", project!.id);
          if (refreshError) {
            throw new Error(
              `Failed to refresh upload session: ${refreshError.message}`,
            );
          }
        }

        return NextResponse.json({
          upload_protocol_version: REPORT_UPLOAD_PROTOCOL_VERSION,
          upload_id: existing.id,
          artifacts: await buildInitArtifactsResponse(
            supabase,
            expectedArtifacts,
          ),
        });
      }
    }

    const uploadId = randomUUID();
    const storedArtifacts = buildStoredReportArtifacts(
      project!.id,
      uploadId,
      artifactManifest,
    );

    const { error } = await supabase.from("report_upload_sessions").insert({
      id: uploadId,
      project_id: project!.id,
      idempotency_key: idempotencyKey,
      upload_protocol_version: REPORT_UPLOAD_PROTOCOL_VERSION,
      status: "initialized",
      init_payload: body,
      artifact_manifest: storedArtifacts,
      lease_id: null,
      lease_expires_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      if (idempotencyKey && /duplicate key value/i.test(error.message || "")) {
        const existing = await loadSessionByIdempotencyKey(
          supabase,
          project!.id,
          idempotencyKey,
        );
        if (existing?.artifact_manifest) {
          return NextResponse.json({
            upload_protocol_version: REPORT_UPLOAD_PROTOCOL_VERSION,
            upload_id: existing.id,
            artifacts: await buildInitArtifactsResponse(
              supabase,
              existing.artifact_manifest as Record<
                string,
                StoredReportArtifactManifest
              >,
            ),
          });
        }
      }
      throw new Error(`Failed to create upload session: ${error.message}`);
    }

    return NextResponse.json({
      upload_protocol_version: REPORT_UPLOAD_PROTOCOL_VERSION,
      upload_id: uploadId,
      artifacts: await buildInitArtifactsResponse(supabase, storedArtifacts),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to initialize upload.",
      },
      { status: 400 },
    );
  }
}
