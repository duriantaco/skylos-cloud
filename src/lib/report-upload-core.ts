import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

export const REPORT_UPLOAD_PROTOCOL_VERSION = 1;
export const REPORT_UPLOAD_BUCKET = "scan-artifacts";
export const REPORT_UPLOAD_SESSION_TTL_HOURS = 24;

export type ReportArtifactManifest = {
  required: boolean;
  filename: string;
  content_type: string;
  content_encoding: string;
  size_bytes: number;
  sha256: string;
};

export type StoredReportArtifactManifest = ReportArtifactManifest & {
  storage_path: string;
};

const ALLOWED_ARTIFACT_NAMES = new Set(["scan_report", "definitions"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readRequiredString(
  value: Record<string, unknown>,
  key: string,
): string {
  const candidate = value[key];
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new Error(`Artifact field '${key}' must be a non-empty string.`);
  }
  return candidate.trim();
}

function readRequiredBoolean(
  value: Record<string, unknown>,
  key: string,
): boolean {
  const candidate = value[key];
  if (typeof candidate !== "boolean") {
    throw new Error(`Artifact field '${key}' must be a boolean.`);
  }
  return candidate;
}

function readRequiredPositiveInteger(
  value: Record<string, unknown>,
  key: string,
): number {
  const candidate = value[key];
  if (
    typeof candidate !== "number" ||
    !Number.isInteger(candidate) ||
    candidate < 0
  ) {
    throw new Error(`Artifact field '${key}' must be a non-negative integer.`);
  }
  return candidate;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function normalizeReportArtifacts(
  artifacts: unknown,
): Record<string, ReportArtifactManifest> {
  const record = asRecord(artifacts);
  if (!record) {
    throw new Error("Upload init payload must include an artifacts object.");
  }

  const normalized: Record<string, ReportArtifactManifest> = {};

  for (const [artifactName, rawManifest] of Object.entries(record)) {
    if (!ALLOWED_ARTIFACT_NAMES.has(artifactName)) {
      throw new Error(`Unsupported artifact '${artifactName}'.`);
    }

    const manifest = asRecord(rawManifest);
    if (!manifest) {
      throw new Error(`Artifact '${artifactName}' must be an object.`);
    }

    normalized[artifactName] = {
      required: readRequiredBoolean(manifest, "required"),
      filename: readRequiredString(manifest, "filename"),
      content_type: readRequiredString(manifest, "content_type"),
      content_encoding: readRequiredString(manifest, "content_encoding"),
      size_bytes: readRequiredPositiveInteger(manifest, "size_bytes"),
      sha256: readRequiredString(manifest, "sha256"),
    };
  }

  if (!normalized.scan_report) {
    throw new Error("Upload init payload must include the 'scan_report' artifact.");
  }
  if (!normalized.scan_report.required) {
    throw new Error("'scan_report' must be marked as required.");
  }

  return normalized;
}

export function buildReportUploadStoragePath(
  projectId: string,
  uploadId: string,
  artifactName: string,
  filename: string,
): string {
  const safeArtifact = sanitizePathSegment(artifactName) || "artifact";
  const safeFilename = sanitizePathSegment(filename) || "upload.bin";
  return `${sanitizePathSegment(projectId)}/${sanitizePathSegment(uploadId)}/${safeArtifact}/${safeFilename}`;
}

export function buildStoredReportArtifacts(
  projectId: string,
  uploadId: string,
  artifacts: Record<string, ReportArtifactManifest>,
): Record<string, StoredReportArtifactManifest> {
  const stored: Record<string, StoredReportArtifactManifest> = {};
  for (const [artifactName, manifest] of Object.entries(artifacts)) {
    stored[artifactName] = {
      ...manifest,
      storage_path: buildReportUploadStoragePath(
        projectId,
        uploadId,
        artifactName,
        manifest.filename,
      ),
    };
  }
  return stored;
}

export function mergeUploadedReportPayload(
  corePayload: unknown,
  definitionsPayload: unknown,
  uploadId: string,
  uploadLeaseId?: string,
): Record<string, unknown> {
  const core = asRecord(corePayload);
  if (!core) {
    throw new Error("Uploaded scan report must be a JSON object.");
  }

  const merged: Record<string, unknown> = {
    ...core,
    upload_id: uploadId,
  };
  if (uploadLeaseId) {
    merged.upload_lease_id = uploadLeaseId;
  }

  if (definitionsPayload != null) {
    const defs = asRecord(definitionsPayload);
    if (!defs) {
      throw new Error("Uploaded definitions artifact must be a JSON object.");
    }
    if ("definitions" in defs) {
      merged.definitions = defs.definitions;
    }
  }

  return merged;
}

export function decodeGzipJsonArtifact(buffer: Buffer): unknown {
  const raw = gunzipSync(buffer).toString("utf-8");
  return JSON.parse(raw);
}

export function verifyUploadedArtifactBuffer(
  buffer: Buffer,
  manifest: ReportArtifactManifest,
): void {
  if (buffer.length !== manifest.size_bytes) {
    throw new Error(
      `Artifact '${manifest.filename}' size mismatch. Expected ${manifest.size_bytes} bytes but received ${buffer.length}.`,
    );
  }

  const digest = createHash("sha256").update(buffer).digest("hex");
  if (digest.toLowerCase() !== manifest.sha256.toLowerCase()) {
    throw new Error(
      `Artifact '${manifest.filename}' digest mismatch. Re-upload the artifact and try again.`,
    );
  }
}

export function isUploadSessionExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) {
    return false;
  }
  const timestamp = Date.parse(expiresAt);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return timestamp <= Date.now();
}
