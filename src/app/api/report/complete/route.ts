import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { POST as postInlineReport } from "@/app/api/report/route";
import {
  getReportSupabaseAdmin,
  resolveReportProject,
} from "@/app/api/report/shared";
import {
  REPORT_UPLOAD_BUCKET,
  REPORT_UPLOAD_PROTOCOL_VERSION,
  StoredReportArtifactManifest,
  decodeGzipJsonArtifact,
  isUploadSessionExpired,
  mergeUploadedReportPayload,
  verifyUploadedArtifactBuffer,
} from "@/lib/report-upload-core";

type UploadSessionRow = {
  id: string;
  project_id: string;
  status: string;
  expires_at: string | null;
  updated_at: string | null;
  lease_id: string | null;
  lease_expires_at: string | null;
  artifact_manifest: Record<string, StoredReportArtifactManifest> | null;
  complete_response: Record<string, unknown> | null;
  scan_id: string | null;
};

const COMPLETION_LEASE_TTL_MS = 30 * 60 * 1000;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getUploadedArtifactNames(
  body: Record<string, unknown>,
  manifest: Record<string, StoredReportArtifactManifest>,
) {
  const record = asRecord(body.artifacts);
  if (!record) {
    throw new Error("Complete payload must include an artifacts object.");
  }

  const uploadedNames = new Set<string>();
  for (const [artifactName, rawValue] of Object.entries(record)) {
    if (!(artifactName in manifest)) {
      throw new Error(`Unexpected uploaded artifact '${artifactName}'.`);
    }
    const value = asRecord(rawValue);
    if (!value) {
      throw new Error(`Artifact '${artifactName}' must be an object.`);
    }
    const key = typeof value.key === "string" ? value.key : "";
    if (key && key !== manifest[artifactName].storage_path) {
      throw new Error(`Artifact key mismatch for '${artifactName}'.`);
    }
    uploadedNames.add(artifactName);
  }

  if (!uploadedNames.has("scan_report")) {
    throw new Error("Complete payload must include the uploaded 'scan_report' artifact.");
  }

  return uploadedNames;
}

async function readUploadedArtifactJson(
  supabase: NonNullable<ReturnType<typeof getReportSupabaseAdmin>>,
  manifest: StoredReportArtifactManifest,
) {
  const download = await supabase.storage
    .from(REPORT_UPLOAD_BUCKET)
    .download(manifest.storage_path);
  if (download.error || !download.data) {
    throw new Error(
      `Artifact '${manifest.filename}' is not available yet. Upload it before calling /api/report/complete.`,
    );
  }

  const buffer = Buffer.from(await download.data.arrayBuffer());
  verifyUploadedArtifactBuffer(buffer, manifest);
  return decodeGzipJsonArtifact(buffer);
}

function hasActiveCompletionLease(
  leaseExpiresAt: string | null | undefined,
): boolean {
  if (!leaseExpiresAt) {
    return false;
  }
  const timestamp = Date.parse(leaseExpiresAt);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return timestamp > Date.now();
}

async function resetUploadSession(
  supabase: NonNullable<ReturnType<typeof getReportSupabaseAdmin>>,
  uploadId: string,
  projectId: string,
  leaseId: string,
) {
  await supabase
    .from("report_upload_sessions")
    .update({
      status: "initialized",
      updated_at: new Date().toISOString(),
      completed_at: null,
      scan_id: null,
      complete_response: null,
      lease_id: null,
      lease_expires_at: null,
    })
    .eq("id", uploadId)
    .eq("project_id", projectId)
    .eq("lease_id", leaseId)
    .eq("status", "completing");
}

async function renewUploadLease(
  supabase: NonNullable<ReturnType<typeof getReportSupabaseAdmin>>,
  uploadId: string,
  projectId: string,
  leaseId: string,
) {
  const nextLeaseExpiresAt = new Date(
    Date.now() + COMPLETION_LEASE_TTL_MS,
  ).toISOString();
  const { data, error } = await supabase
    .from("report_upload_sessions")
    .update({
      updated_at: new Date().toISOString(),
      lease_expires_at: nextLeaseExpiresAt,
    })
    .eq("id", uploadId)
    .eq("project_id", projectId)
    .eq("status", "completing")
    .eq("lease_id", leaseId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to renew upload lease: ${error.message}`);
  }
  if (!data) {
    throw new Error("Upload lease is no longer active. Retry the upload.");
  }
}

async function loadUploadSession(
  supabase: NonNullable<ReturnType<typeof getReportSupabaseAdmin>>,
  uploadId: string,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("report_upload_sessions")
    .select(
      "id, project_id, status, expires_at, updated_at, lease_id, lease_expires_at, artifact_manifest, complete_response, scan_id",
    )
    .eq("id", uploadId)
    .eq("project_id", projectId)
    .maybeSingle<UploadSessionRow>();

  if (error) {
    throw new Error(`Failed to load upload session: ${error.message}`);
  }

  return data;
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

  const uploadId =
    typeof body.upload_id === "string" && body.upload_id.trim().length > 0
      ? body.upload_id.trim()
      : null;
  if (!uploadId) {
    return NextResponse.json(
      { error: "Complete payload must include upload_id." },
      { status: 400 },
    );
  }

  let activeLeaseId: string | null = null;
  try {
    let session = await loadUploadSession(supabase, uploadId, project!.id);
    if (!session) {
      return NextResponse.json(
        { error: "Upload session not found." },
        { status: 404 },
      );
    }

    if (isUploadSessionExpired(session.expires_at)) {
      await supabase
        .from("report_upload_sessions")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", uploadId);
      return NextResponse.json(
        { error: "Upload session expired. Start a new upload." },
        { status: 410 },
      );
    }

    if (session.status === "completed" && session.complete_response) {
      return NextResponse.json(session.complete_response);
    }

    let claimStatus: "initialized" | "failed" | "completing" | null = null;
    if (session.status === "initialized" || session.status === "failed") {
      claimStatus = session.status;
    } else if (session.status === "completing") {
      if (hasActiveCompletionLease(session.lease_expires_at)) {
        return NextResponse.json(
          { error: "Upload session is already being completed. Retry shortly." },
          { status: 409 },
        );
      }
      claimStatus = "completing";
    }

    if (!claimStatus) {
      return NextResponse.json(
        { error: `Upload session is not claimable from status '${session.status}'.` },
        { status: 409 },
      );
    }

    const leaseId = randomUUID();
    const leaseExpiresAt = new Date(
      Date.now() + COMPLETION_LEASE_TTL_MS,
    ).toISOString();

    let claimQuery = supabase
      .from("report_upload_sessions")
      .update({
        status: "completing",
        updated_at: new Date().toISOString(),
        lease_id: leaseId,
        lease_expires_at: leaseExpiresAt,
      })
      .eq("id", uploadId)
      .eq("project_id", project!.id);

    claimQuery = claimQuery.eq("status", claimStatus);

    if (claimStatus === "completing") {
      if (session.lease_id) {
        claimQuery = claimQuery.eq("lease_id", session.lease_id);
      } else {
        claimQuery = claimQuery.is("lease_id", null);
      }
      if (session.lease_expires_at) {
        claimQuery = claimQuery.eq("lease_expires_at", session.lease_expires_at);
      } else {
        claimQuery = claimQuery.is("lease_expires_at", null);
      }
    }

    const claim = await claimQuery
      .select(
        "id, project_id, status, expires_at, updated_at, lease_id, lease_expires_at, artifact_manifest, complete_response, scan_id",
      )
      .maybeSingle<UploadSessionRow>();

    if (claim.error) {
      throw new Error(`Failed to claim upload session: ${claim.error.message}`);
    }

    if (!claim.data) {
      session = await loadUploadSession(supabase, uploadId, project!.id);
      if (session?.status === "completed" && session.complete_response) {
        return NextResponse.json(session.complete_response);
      }
      return NextResponse.json(
        { error: "Upload session is already being completed. Retry shortly." },
        { status: 409 },
      );
    }
    activeLeaseId = leaseId;
    await renewUploadLease(supabase, uploadId, project!.id, leaseId);

    const manifestRecord = asRecord(claim.data.artifact_manifest);
    if (!manifestRecord) {
      throw new Error("Upload session artifact manifest is missing.");
    }
    const manifest = manifestRecord as Record<string, StoredReportArtifactManifest>;
    const uploadedArtifacts = getUploadedArtifactNames(
      body as Record<string, unknown>,
      manifest,
    );

    let corePayload: unknown;
    let definitionsPayload: unknown = null;

    try {
      corePayload = await readUploadedArtifactJson(supabase, manifest.scan_report);
      if (uploadedArtifacts.has("definitions") && manifest.definitions) {
        definitionsPayload = await readUploadedArtifactJson(
          supabase,
          manifest.definitions,
        );
      }
    } catch (error) {
      await resetUploadSession(supabase, uploadId, project!.id, leaseId);
      throw error;
    }

    await renewUploadLease(supabase, uploadId, project!.id, leaseId);

    const inlineBody = mergeUploadedReportPayload(
      corePayload,
      definitionsPayload,
      uploadId,
      leaseId,
    );

    const forwardedHeaders = new Headers();
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      forwardedHeaders.set("authorization", authHeader);
    }
    const authMode = req.headers.get("x-skylos-auth");
    if (authMode) {
      forwardedHeaders.set("x-skylos-auth", authMode);
    }
    forwardedHeaders.set("content-type", "application/json");

    const inlineReq = new Request(new URL("/api/report", req.url), {
      method: "POST",
      headers: forwardedHeaders,
      body: JSON.stringify(inlineBody),
    });

    await renewUploadLease(supabase, uploadId, project!.id, leaseId);
    const inlineResponse = await postInlineReport(inlineReq);
    const inlineJson = await inlineResponse.json();

    if (!inlineResponse.ok) {
      await resetUploadSession(supabase, uploadId, project!.id, leaseId);
      return NextResponse.json(inlineJson, { status: inlineResponse.status });
    }

    await supabase
      .from("report_upload_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        scan_id:
          (typeof inlineJson.scan_id === "string" && inlineJson.scan_id) ||
          (typeof inlineJson.scanId === "string" && inlineJson.scanId) ||
          null,
        complete_response: inlineJson,
        lease_id: null,
        lease_expires_at: null,
      })
      .eq("id", uploadId)
      .eq("project_id", project!.id)
      .eq("lease_id", leaseId);

    const cleanupPaths = Array.from(uploadedArtifacts)
      .map((artifactName) => manifest[artifactName]?.storage_path)
      .filter((value): value is string => !!value);
    if (cleanupPaths.length > 0) {
      await supabase.storage.from(REPORT_UPLOAD_BUCKET).remove(cleanupPaths);
    }

    return NextResponse.json(inlineJson, { status: inlineResponse.status });
  } catch (error) {
    if (activeLeaseId) {
      await resetUploadSession(
        supabase,
        uploadId,
        project!.id,
        activeLeaseId,
      ).catch(() => null);
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to complete upload.",
      },
      { status: 400 },
    );
  }
}
