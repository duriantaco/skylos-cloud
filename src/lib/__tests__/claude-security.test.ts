/**
 * Tests for lib/claude-security.ts
 *
 * Run with: npx vitest run src/lib/__tests__/claude-security.test.ts
 * (Add vitest to devDependencies first: npm i -D vitest)
 */

import { describe, it, expect } from "vitest";
import {
  isClaudeSecurityReport,
  claudeSecurityToSkylosPayload,
} from "../claude-security";

// ── Sample data ─────────────────────────────────────────────────────────────

const SAMPLE_CCS_REPORT = {
  tool: "claude-code-security",
  scan_metadata: { model: "claude-opus-4-6", duration_ms: 12345 },
  findings: [
    {
      id: "sql-injection",
      severity: "critical",
      file_path: "app/db.py",
      line_number: 42,
      message: "SQL injection via unsanitized user input",
      confidence_score: 0.95,
      exploit_scenario: "Attacker passes malicious SQL in query param",
      fix: "Use parameterized queries",
      cwe: "CWE-89",
      snippet: "cursor.execute(f'SELECT * FROM users WHERE id={user_id}')",
    },
    {
      id: "xss-reflected",
      severity: "high",
      file_path: "app/views.py",
      line_number: 18,
      message: "Reflected XSS in template rendering",
      confidence_score: 0.82,
      cwe: "CWE-79",
    },
    {
      id: "weak-crypto",
      severity: "medium",
      file: "utils/crypto.py",
      line: 7,
      description: "MD5 used for password hashing",
      confidence_score: 0.7,
    },
    {
      id: "debug-enabled",
      severity: "low",
      file_path: "settings.py",
      line_number: 1,
      message: "Debug mode enabled in production config",
      confidence_score: 0.6,
    },
  ],
};

const ALTERNATIVE_FORMAT = {
  scanner: "claude-code-security",
  vulnerabilities: [
    {
      type: "path-traversal",
      severity: "high",
      location: { file: "api/files.py", line: 33 },
      title: "Path traversal in file upload handler",
      confidence: 0.88,
      exploit: "Upload file with ../../../etc/passwd",
      remediation: "Sanitize file paths",
    },
  ],
};

const SARIF_REPORT = {
  runs: [{ tool: { driver: { name: "eslint" } } }],
};

const SKYLOS_DEFEND_REPORT = {
  tool: "skylos-defend",
  summary: {},
  findings: [],
  defense_score: {
    score_pct: 100,
    risk_rating: "SECURE",
  },
  defense_findings: [{ plugin_id: "model-pinned", passed: true }],
  defense_integrations: [{ provider: "OpenAI", location: "app.py:10" }],
};

// ── Detection tests ─────────────────────────────────────────────────────────

describe("isClaudeSecurityReport", () => {
  it("detects standard format", () => {
    expect(isClaudeSecurityReport(SAMPLE_CCS_REPORT)).toBe(true);
  });

  it("detects alternative format with vulnerabilities key", () => {
    expect(isClaudeSecurityReport(ALTERNATIVE_FORMAT)).toBe(true);
  });

  it("rejects SARIF format", () => {
    expect(isClaudeSecurityReport(SARIF_REPORT)).toBe(false);
  });

  it("rejects null/string/number", () => {
    expect(isClaudeSecurityReport(null)).toBe(false);
    expect(isClaudeSecurityReport("string")).toBe(false);
    expect(isClaudeSecurityReport(42)).toBe(false);
  });

  it("rejects empty object", () => {
    expect(isClaudeSecurityReport({})).toBe(false);
  });

  it("detects empty findings with tool key", () => {
    expect(
      isClaudeSecurityReport({ tool: "claude-code-security", findings: [] })
    ).toBe(true);
  });

  it("rejects empty findings without tool key", () => {
    expect(isClaudeSecurityReport({ findings: [] })).toBe(false);
  });

  it("rejects skylos defend payloads even with a tool key", () => {
    expect(isClaudeSecurityReport(SKYLOS_DEFEND_REPORT)).toBe(false);
  });
});

// ── Normalizer tests ────────────────────────────────────────────────────────

describe("claudeSecurityToSkylosPayload", () => {
  it("returns correct finding count", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.findings.length).toBe(4);
  });

  it("prefixes rule_id with CCS:", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    for (const f of result.findings) {
      expect(f.rule_id).toMatch(/^CCS:/);
    }
  });

  it("does not double-prefix CCS:", () => {
    const data = {
      findings: [
        {
          id: "CCS:already-prefixed",
          severity: "high",
          file_path: "a.py",
          line_number: 1,
          message: "test",
          confidence_score: 0.9,
        },
      ],
    };
    const result = claudeSecurityToSkylosPayload(data);
    expect(result.findings[0].rule_id).toBe("CCS:already-prefixed");
  });

  it("maps severities correctly", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    const severities = result.findings.map((f) => f.severity);
    expect(severities).toEqual(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
  });

  it("sets category to SECURITY for all findings", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    for (const f of result.findings) {
      expect(f.category).toBe("SECURITY");
    }
  });

  it("extracts file paths from different key names", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.findings[0].file_path).toBe("app/db.py");
    expect(result.findings[2].file_path).toBe("utils/crypto.py"); // uses "file" key
  });

  it("extracts line numbers from different key names", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.findings[0].line_number).toBe(42);
    expect(result.findings[2].line_number).toBe(7); // uses "line" key
  });

  it("extracts messages from different key names", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.findings[0].message).toBe(
      "SQL injection via unsanitized user input"
    );
    expect(result.findings[2].message).toBe("MD5 used for password hashing"); // uses "description"
  });

  it("preserves snippet", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.findings[0].snippet).toContain("cursor.execute");
  });

  it("preserves confidence_score in source_metadata", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.source_metadata[0].confidence_score).toBe(0.95);
  });

  it("preserves exploit_scenario in source_metadata", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.source_metadata[0].exploit_scenario).toContain(
      "malicious SQL"
    );
  });

  it("preserves CWE in source_metadata", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.source_metadata[0].cwe).toBe("CWE-89");
  });

  it("preserves suggested_fix in source_metadata", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.source_metadata[0].suggested_fix).toBe(
      "Use parameterized queries"
    );
  });

  it("sets source to claude-code-security", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.source).toBe("claude-code-security");
  });

  it("handles alternative format with location object", () => {
    const result = claudeSecurityToSkylosPayload(ALTERNATIVE_FORMAT);
    expect(result.findings[0].file_path).toBe("api/files.py");
    expect(result.findings[0].line_number).toBe(33);
    expect(result.findings[0].rule_id).toBe("CCS:path-traversal");
  });

  it("handles empty findings", () => {
    const result = claudeSecurityToSkylosPayload({ findings: [] });
    expect(result.findings).toEqual([]);
    expect(result.source_metadata).toEqual([]);
  });

  it("defaults invalid line numbers to 1", () => {
    const data = {
      findings: [
        {
          id: "test",
          file_path: "a.py",
          line_number: "bad",
          message: "test",
          confidence_score: 0.5,
        },
      ],
    };
    const result = claudeSecurityToSkylosPayload(data);
    expect(result.findings[0].line_number).toBe(1);
  });

  it("deduplicates findings by rule+file+line", () => {
    const data = {
      findings: [
        {
          id: "dup",
          file_path: "a.py",
          line_number: 10,
          message: "first",
          confidence_score: 0.9,
        },
        {
          id: "dup",
          file_path: "a.py",
          line_number: 10,
          message: "second",
          confidence_score: 0.8,
        },
      ],
    };
    const result = claudeSecurityToSkylosPayload(data);
    expect(result.findings.length).toBe(1);
  });

  it("produces correct summary counts", () => {
    const result = claudeSecurityToSkylosPayload(SAMPLE_CCS_REPORT);
    expect(result.summary.total_issues).toBe(4);
    // CRITICAL + HIGH = 2
    expect(result.summary.danger_count).toBe(2);
    expect(result.summary.quality_count).toBe(0);
    expect(result.summary.secret_count).toBe(0);
    expect(result.summary.dead_code_count).toBe(0);
  });
});
