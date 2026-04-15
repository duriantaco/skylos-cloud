import test from "node:test";
import assert from "node:assert/strict";
import {
  computeJudgeSnapshot,
  normalizeJudgeRepoIdentity,
  JUDGE_SCORING_VERSION,
} from "../../src/lib/judge-core";

test("normalizeJudgeRepoIdentity canonicalizes GitHub owner and repo names", () => {
  assert.deepEqual(
    normalizeJudgeRepoIdentity({
      owner: "PSF",
      name: "Black",
    }),
    {
      host: "github",
      owner: "psf",
      name: "black",
      fullName: "psf/black",
      sourceUrl: "https://github.com/psf/black",
    }
  );
});

test("computeJudgeSnapshot scores clean repos highly", () => {
  const snapshot = computeJudgeSnapshot({
    normalizedPayload: {
      summary: {
        total_issues: 0,
        danger_count: 0,
        quality_count: 0,
        dead_code_count: 0,
        secret_count: 0,
      },
      findings: [],
    },
  });

  assert.equal(snapshot.grade, "A");
  assert.equal(snapshot.overallScore, 100);
  assert.equal(snapshot.securityScore, 100);
  assert.equal(snapshot.qualityScore, 100);
  assert.equal(snapshot.deadCodeScore, 100);
  assert.equal(snapshot.summary.scoring_version, JUDGE_SCORING_VERSION);
});

test("computeJudgeSnapshot penalizes security issues more heavily than quality noise", () => {
  const snapshot = computeJudgeSnapshot({
    normalizedPayload: {
      summary: {
        total_issues: 4,
        quality_count: 1,
        dead_code_count: 1,
        secret_count: 1,
      },
      findings: [
        {
          rule_id: "SKY-D010",
          file_path: "api.py",
          line_number: 8,
          message: "Missing auth check",
          severity: "CRITICAL",
          category: "SECURITY",
        },
        {
          rule_id: "SKY-S001",
          file_path: "settings.py",
          line_number: 2,
          message: "Secret in source",
          severity: "HIGH",
          category: "SECRET",
        },
        {
          rule_id: "SKY-Q101",
          file_path: "utils.py",
          line_number: 4,
          message: "Risky broad exception",
          severity: "LOW",
          category: "QUALITY",
        },
        {
          rule_id: "SKY-U001",
          file_path: "legacy.py",
          line_number: 12,
          message: "Unused helper",
          severity: "LOW",
          category: "DEAD_CODE",
        },
      ],
    },
    fairnessNotes: ["Large monorepo support is not enabled yet.", "Large monorepo support is not enabled yet."],
  });

  assert.equal(snapshot.grade, "C");
  assert.equal(snapshot.securityScore < snapshot.qualityScore, true);
  assert.equal(snapshot.securityScore < snapshot.deadCodeScore, true);
  assert.equal(snapshot.topFindings[0]?.ruleId, "SKY-D010");
  assert.deepEqual(snapshot.fairnessNotes, ["Large monorepo support is not enabled yet."]);
});
