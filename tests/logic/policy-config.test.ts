import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_ANALYSIS_POLICY,
  getPolicyInheritanceMode,
  mergeAnalysisPolicyConfig,
  readAnalysisPolicyConfig,
  resolveEffectiveAiAssuranceEnabled,
  resolveEffectiveAnalysisPolicy,
} from "../../src/lib/policy-config";

test("getPolicyInheritanceMode defaults unknown values to inherit", () => {
  assert.equal(getPolicyInheritanceMode(undefined), "inherit");
  assert.equal(getPolicyInheritanceMode("inherit"), "inherit");
  assert.equal(getPolicyInheritanceMode("custom"), "custom");
  assert.equal(getPolicyInheritanceMode("weird"), "inherit");
});

test("readAnalysisPolicyConfig ignores malformed values and falls back safely", () => {
  const parsed = readAnalysisPolicyConfig({
    custom_rules: {},
    exclude_paths: "src/**",
    complexity_threshold: "ten",
    complexity_enabled: "FALSE",
    gate: {
      enabled: "not-bool",
      mode: "both",
      by_category: {
        SECURITY: "4",
        SECRET: "oops",
      },
      by_severity: {
        CRITICAL: "2",
      },
    },
  });

  assert.equal(parsed.complexity_enabled, false);
  assert.equal(parsed.complexity_threshold, 10);
  assert.deepEqual(parsed.custom_rules, []);
  assert.deepEqual(parsed.exclude_paths, []);
  assert.equal(parsed.gate.enabled, true);
  assert.equal(parsed.gate.mode, "both");
  assert.equal(parsed.gate.by_category.SECURITY, 4);
  assert.equal(parsed.gate.by_category.SECRET, 0);
  assert.equal(parsed.gate.by_severity.CRITICAL, 2);
});

test("mergeAnalysisPolicyConfig preserves non-policy project settings", () => {
  const merged = mergeAnalysisPolicyConfig(
    {
      github_auto_configure_on_install: true,
    },
    {
      ...DEFAULT_ANALYSIS_POLICY,
      custom_rules: ["rule-a"],
    }
  );

  assert.equal(merged.github_auto_configure_on_install, true);
  assert.deepEqual(merged.custom_rules, ["rule-a"]);
});

test("resolveEffectiveAnalysisPolicy and AI assurance honor inheritance mode", () => {
  const baseline = {
    ...DEFAULT_ANALYSIS_POLICY,
    custom_rules: ["baseline-rule"],
  };
  const projectOverride = {
    ...DEFAULT_ANALYSIS_POLICY,
    custom_rules: ["project-rule"],
  };

  const inherited = resolveEffectiveAnalysisPolicy({
    organizationPolicyConfig: baseline,
    projectPolicyConfig: projectOverride,
    projectPolicyInheritanceMode: "inherit",
  });
  const custom = resolveEffectiveAnalysisPolicy({
    organizationPolicyConfig: baseline,
    projectPolicyConfig: projectOverride,
    projectPolicyInheritanceMode: "custom",
  });

  assert.deepEqual(inherited.custom_rules, ["baseline-rule"]);
  assert.deepEqual(custom.custom_rules, ["project-rule"]);
  assert.equal(
    resolveEffectiveAiAssuranceEnabled({
      organizationAiAssuranceEnabled: true,
      projectAiAssuranceEnabled: false,
      projectPolicyInheritanceMode: "inherit",
    }),
    true
  );
  assert.equal(
    resolveEffectiveAiAssuranceEnabled({
      organizationAiAssuranceEnabled: true,
      projectAiAssuranceEnabled: false,
      projectPolicyInheritanceMode: "custom",
    }),
    false
  );
});
