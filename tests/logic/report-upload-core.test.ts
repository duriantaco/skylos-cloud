import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  buildReportUploadStoragePath,
  buildStoredReportArtifacts,
  mergeUploadedReportPayload,
  normalizeReportArtifacts,
  verifyUploadedArtifactBuffer,
} from "../../src/lib/report-upload-core";

test("normalizeReportArtifacts requires scan_report", () => {
  assert.throws(
    () =>
      normalizeReportArtifacts({
        definitions: {
          required: false,
          filename: "definitions.json.gz",
          content_type: "application/json",
          content_encoding: "gzip",
          size_bytes: 128,
          sha256: "abc",
        },
      }),
    /scan_report/,
  );
});

test("buildReportUploadStoragePath sanitizes path segments", () => {
  const path = buildReportUploadStoragePath(
    "proj_123",
    "upload/456",
    "scan_report",
    "scan report.json.gz",
  );

  assert.equal(
    path,
    "proj_123/upload-456/scan_report/scan-report.json.gz",
  );
});

test("buildStoredReportArtifacts adds storage paths", () => {
  const artifacts = buildStoredReportArtifacts("proj", "upload", {
    scan_report: {
      required: true,
      filename: "scan-report.json.gz",
      content_type: "application/json",
      content_encoding: "gzip",
      size_bytes: 321,
      sha256: "deadbeef",
    },
  });

  assert.equal(
    artifacts.scan_report.storage_path,
    "proj/upload/scan_report/scan-report.json.gz",
  );
});

test("mergeUploadedReportPayload adds upload id and definitions", () => {
  const merged = mergeUploadedReportPayload(
    {
      summary: { total: 1 },
      findings: [{ rule_id: "RULE-1" }],
    },
    {
      definitions: {
        "app.main": {
          file: "app.py",
          line: 1,
        },
      },
    },
    "upload-123",
    "lease-123",
  );

  assert.equal(merged.upload_id, "upload-123");
  assert.equal(merged.upload_lease_id, "lease-123");
  assert.deepEqual(merged.definitions, {
    "app.main": {
      file: "app.py",
      line: 1,
    },
  });
});

test("verifyUploadedArtifactBuffer accepts matching manifest", () => {
  const buffer = Buffer.from("payload");
  assert.doesNotThrow(() =>
    verifyUploadedArtifactBuffer(buffer, {
      required: true,
      filename: "scan-report.json.gz",
      content_type: "application/json",
      content_encoding: "gzip",
      size_bytes: buffer.length,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    }),
  );
});

test("verifyUploadedArtifactBuffer rejects mismatched manifest", () => {
  const buffer = Buffer.from("payload");
  assert.throws(
    () =>
      verifyUploadedArtifactBuffer(buffer, {
        required: true,
        filename: "scan-report.json.gz",
        content_type: "application/json",
        content_encoding: "gzip",
        size_bytes: buffer.length + 1,
        sha256: "deadbeef",
      }),
    /size mismatch/,
  );
});
