import assert from "node:assert/strict";
import { normalizeIncomingReport } from "../src/lib/report-normalization";

function verifyNativePayload() {
  const normalized = normalizeIncomingReport({
    summary: { total_issues: 1 },
    findings: [
      {
        rule_id: "SKY-D001",
        file_path: "app.py",
        line_number: 10,
        message: "Potential SQL injection",
        severity: "HIGH",
        category: "SECURITY",
      },
    ],
    defense_score: { weighted_score: 80 },
    defense_findings: [{ id: "df-1" }],
  });

  assert.equal(normalized.tool, "skylos");
  assert.equal(normalized.source, "skylos");
  assert.equal(normalized.commit_hash, "local");
  assert.equal(normalized.branch, "main");
  assert.equal(normalized.actor, "unknown");
  assert.deepEqual(normalized.summary, { total_issues: 1 });
  assert.equal(normalized.findings.length, 1);
  assert.deepEqual(normalized.defense_score, { weighted_score: 80 });
  assert.deepEqual(normalized.defense_findings, [{ id: "df-1" }]);
}

function verifyDefensePayload() {
  const normalized = normalizeIncomingReport({
    tool: "skylos-defend",
    actor: "cli-user",
    commit_hash: "deadbeef",
    branch: "main",
    summary: {},
    findings: [],
    defense_score: {
      integrations_found: 1,
      files_scanned: 1,
      weighted_score: 16,
      weighted_max: 16,
      score_pct: 100,
      risk_rating: "SECURE",
      total_checks: 3,
      passed: 3,
      by_severity: {
        critical: { passed: 1, failed: 0, weight: 8 },
      },
    },
    ops_score: {
      passed: 2,
      total: 2,
      score_pct: 100,
      rating: "EXCELLENT",
    },
    owasp_coverage: {
      LLM02: { name: "Insecure Output Handling", status: "covered" },
    },
    defense_findings: [
      { plugin_id: "model-pinned", passed: true, severity: "medium" },
    ],
    defense_integrations: [
      { provider: "OpenAI", integration_type: "chat", location: "app.py:10" },
    ],
  });

  assert.equal(normalized.tool, "skylos-defend");
  assert.equal(normalized.source, "skylos");
  assert.equal(normalized.actor, "cli-user");
  assert.equal(normalized.commit_hash, "deadbeef");
  assert.equal(normalized.branch, "main");
  assert.equal(normalized.findings.length, 0);
  assert.deepEqual(normalized.defense_score, {
    integrations_found: 1,
    files_scanned: 1,
    weighted_score: 16,
    weighted_max: 16,
    score_pct: 100,
    risk_rating: "SECURE",
    total_checks: 3,
    passed: 3,
    by_severity: {
      critical: { passed: 1, failed: 0, weight: 8 },
    },
  });
  assert.deepEqual(normalized.ops_score, {
    passed: 2,
    total: 2,
    score_pct: 100,
    rating: "EXCELLENT",
  });
  assert.deepEqual(normalized.defense_findings, [
    { plugin_id: "model-pinned", passed: true, severity: "medium" },
  ]);
  assert.deepEqual(normalized.defense_integrations, [
    { provider: "OpenAI", integration_type: "chat", location: "app.py:10" },
  ]);
}

function verifySarifPayload() {
  const normalized = normalizeIncomingReport({
    actor: "ci-bot",
    commit_hash: "abc123",
    branch: "feature/test",
    runs: [
      {
        tool: {
          driver: {
            name: "Skylos",
            rules: [
              {
                id: "SKY-D001",
                properties: {
                  category: "SECURITY",
                  "security-severity": "8.0",
                },
              },
            ],
          },
        },
        results: [
          {
            ruleId: "SKY-D001",
            level: "error",
            message: { text: "SQL injection" },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: "github/workspace/src/app.py" },
                  region: {
                    startLine: 12,
                    snippet: { text: "cursor.execute(query)" },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  });

  assert.equal(normalized.tool, "sarif");
  assert.equal(normalized.source, "skylos");
  assert.equal(normalized.actor, "ci-bot");
  assert.equal(normalized.commit_hash, "abc123");
  assert.equal(normalized.branch, "feature/test");
  assert.equal(normalized.findings.length, 1);
  assert.equal(normalized.findings[0]?.rule_id, "SKY-D001");
  assert.equal(normalized.findings[0]?.file_path, "src/app.py");
  assert.equal(normalized.findings[0]?.line_number, 12);
  assert.equal(normalized.findings[0]?.severity, "HIGH");
  assert.equal(normalized.findings[0]?.category, "SECURITY");
}

function verifyClaudePayload() {
  const normalized = normalizeIncomingReport({
    scanner: "claude-security",
    findings: [
      {
        id: "AUTH-001",
        file_path: "src/auth.ts",
        line_number: 27,
        severity: "critical",
        title: "Missing authorization check",
        confidence_score: 0.94,
        suggested_fix: "Add role validation before returning the resource.",
      },
    ],
  });

  assert.equal(normalized.tool, "claude-code-security");
  assert.equal(normalized.source, "claude-code-security");
  assert.equal(normalized.actor, "claude-security");
  assert.equal(normalized.findings.length, 1);
  assert.equal(normalized.findings[0]?.rule_id, "CCS:AUTH-001");
  assert.equal(normalized.findings[0]?.severity, "CRITICAL");
  assert.equal(normalized.source_metadata?.length, 1);
  assert.deepEqual(normalized.source_metadata?.[0], {
    confidence_score: 0.94,
    suggested_fix: "Add role validation before returning the resource.",
  });
}

function main() {
  verifyNativePayload();
  verifyDefensePayload();
  verifySarifPayload();
  verifyClaudePayload();
  console.log("verify-report-normalization: ok");
}

main();
