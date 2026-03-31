import test from "node:test";
import assert from "node:assert/strict";
import {
  buildActiveSuppressionKeys,
  buildSuppressionKey,
} from "../../src/lib/report-suppressions-core";

test("buildActiveSuppressionKeys excludes expired suppressions", () => {
  const rows = [
    {
      rule_id: "RULE-1",
      file_path: "src/app.py",
      line_number: 10,
      expires_at: "2099-01-01T00:00:00.000Z",
    },
    {
      rule_id: "RULE-2",
      file_path: "src/old.py",
      line_number: 20,
      expires_at: "2020-01-01T00:00:00.000Z",
    },
  ];

  const keys = buildActiveSuppressionKeys(
    rows,
    "2026-03-30T00:00:00.000Z",
    (value) => value
  );

  assert.equal(keys.has(buildSuppressionKey("RULE-1", "src/app.py", 10)), true);
  assert.equal(keys.has(buildSuppressionKey("RULE-2", "src/old.py", 20)), false);
});

test("buildActiveSuppressionKeys normalizes paths through the provided callback", () => {
  const keys = buildActiveSuppressionKeys(
    [
      {
        rule_id: "RULE-3",
        file_path: "\\src\\feature.py",
        line_number: 7,
      },
    ],
    "2026-03-30T00:00:00.000Z",
    (value) => value.replace(/\\/g, "/")
  );

  assert.deepEqual(Array.from(keys), [
    buildSuppressionKey("RULE-3", "/src/feature.py", 7),
  ]);
});
