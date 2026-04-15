import test from "node:test";
import assert from "node:assert/strict";
import { hasPublishedJudgeScorecard } from "../../src/lib/judge-public";

test("hasPublishedJudgeScorecard keeps clean imported scorecards", () => {
  assert.equal(
    hasPublishedJudgeScorecard({
      analysis_kind: "static",
      status: "ready",
      overall_score: 100,
      security_score: 100,
      quality_score: 100,
      dead_code_score: 100,
      summary: {
        counts: {
          total_issues: 0,
          security: 0,
          secrets: 0,
          quality: 0,
          dead_code: 0,
        },
      },
      top_findings: [],
    }),
    true
  );
});

test("hasPublishedJudgeScorecard keeps real low-scoring repos with findings", () => {
  assert.equal(
    hasPublishedJudgeScorecard({
      analysis_kind: "static",
      status: "ready",
      overall_score: 0,
      security_score: 0,
      quality_score: 0,
      dead_code_score: 0,
      summary: {
        counts: {
          total_issues: 7,
          security: 5,
          secrets: 1,
          quality: 1,
          dead_code: 0,
        },
      },
      top_findings: [
        {
          ruleId: "SKY-D212",
          filePath: "bad.py",
          lineNumber: 11,
          severity: "HIGH",
          category: "SECURITY",
          message: "Possible command injection",
        },
      ],
    }),
    true
  );
});

test("hasPublishedJudgeScorecard drops placeholder zero-score snapshots", () => {
  assert.equal(
    hasPublishedJudgeScorecard({
      analysis_kind: "static",
      status: "ready",
      overall_score: 0,
      security_score: 0,
      quality_score: 0,
      dead_code_score: 0,
      summary: {
        counts: {
          total_issues: 0,
          security: 0,
          secrets: 0,
          quality: 0,
          dead_code: 0,
        },
      },
      top_findings: [],
    }),
    false
  );
});

test("hasPublishedJudgeScorecard drops non-static or non-ready snapshots", () => {
  assert.equal(
    hasPublishedJudgeScorecard({
      analysis_kind: "agent",
      status: "ready",
      overall_score: 88,
    }),
    false
  );

  assert.equal(
    hasPublishedJudgeScorecard({
      analysis_kind: "static",
      status: "unsupported",
      overall_score: 88,
    }),
    false
  );
});
