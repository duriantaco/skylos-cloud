export type GateMode = "zero-new" | "category" | "severity" | "both";
export type GateThresholds = Record<string, number>;
export type ProjectPolicyInheritanceMode = "inherit" | "custom";

export type AnalysisPolicyConfig = {
  custom_rules: string[];
  exclude_paths: string[];
  complexity_enabled: boolean;
  complexity_threshold: number;
  nesting_enabled: boolean;
  nesting_threshold: number;
  function_length_enabled: boolean;
  function_length_threshold: number;
  arg_count_enabled: boolean;
  arg_count_threshold: number;
  security_enabled: boolean;
  secrets_enabled: boolean;
  quality_enabled: boolean;
  dead_code_enabled: boolean;
  gate: {
    enabled: boolean;
    mode: GateMode;
    by_category: GateThresholds;
    by_severity: GateThresholds;
  };
};

const GATE_MODES: GateMode[] = ["zero-new", "category", "severity", "both"];

export const CATEGORY_KEYS = [
  "SECURITY",
  "SECRET",
  "QUALITY",
  "DEAD_CODE",
  "DEPENDENCY",
] as const;

export const SEVERITY_KEYS = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

export const DEFAULT_ANALYSIS_POLICY: AnalysisPolicyConfig = {
  custom_rules: [],
  exclude_paths: [],
  complexity_enabled: true,
  complexity_threshold: 10,
  nesting_enabled: true,
  nesting_threshold: 4,
  function_length_enabled: true,
  function_length_threshold: 50,
  arg_count_enabled: true,
  arg_count_threshold: 5,
  security_enabled: true,
  secrets_enabled: true,
  quality_enabled: true,
  dead_code_enabled: true,
  gate: {
    enabled: true,
    mode: "zero-new",
    by_category: {
      SECURITY: 0,
      SECRET: 0,
      QUALITY: 0,
      DEAD_CODE: 0,
      DEPENDENCY: 0,
    },
    by_severity: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    },
  },
};

type PolicyConfigRecord = Record<string, unknown> | null | undefined;

function toNonNegInt(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function toBool(v: unknown, fallback: boolean) {
  if (v === true || v === false) return v;
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function toStringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeThresholdMap(
  value: unknown,
  keys: readonly string[],
  fallback: Record<string, number>
) {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const result: Record<string, number> = {};
  for (const key of keys) {
    result[key] = toNonNegInt(source[key], fallback[key] ?? 0);
  }
  return result;
}

export function getPolicyInheritanceMode(
  value: unknown
): ProjectPolicyInheritanceMode {
  return value === "custom" ? "custom" : "inherit";
}

export function readAnalysisPolicyConfig(
  policyConfig: PolicyConfigRecord
): AnalysisPolicyConfig {
  const source =
    policyConfig && typeof policyConfig === "object"
      ? (policyConfig as Record<string, unknown>)
      : {};
  const gate =
    source.gate && typeof source.gate === "object"
      ? (source.gate as Record<string, unknown>)
      : {};

  return {
    custom_rules: toStringArray(source.custom_rules, 50),
    exclude_paths: toStringArray(source.exclude_paths, 100),
    complexity_enabled: toBool(
      source.complexity_enabled,
      DEFAULT_ANALYSIS_POLICY.complexity_enabled
    ),
    complexity_threshold: toNonNegInt(
      source.complexity_threshold,
      DEFAULT_ANALYSIS_POLICY.complexity_threshold
    ),
    nesting_enabled: toBool(
      source.nesting_enabled,
      DEFAULT_ANALYSIS_POLICY.nesting_enabled
    ),
    nesting_threshold: toNonNegInt(
      source.nesting_threshold,
      DEFAULT_ANALYSIS_POLICY.nesting_threshold
    ),
    function_length_enabled: toBool(
      source.function_length_enabled,
      DEFAULT_ANALYSIS_POLICY.function_length_enabled
    ),
    function_length_threshold: toNonNegInt(
      source.function_length_threshold,
      DEFAULT_ANALYSIS_POLICY.function_length_threshold
    ),
    arg_count_enabled: toBool(
      source.arg_count_enabled,
      DEFAULT_ANALYSIS_POLICY.arg_count_enabled
    ),
    arg_count_threshold: toNonNegInt(
      source.arg_count_threshold,
      DEFAULT_ANALYSIS_POLICY.arg_count_threshold
    ),
    security_enabled: toBool(
      source.security_enabled,
      DEFAULT_ANALYSIS_POLICY.security_enabled
    ),
    secrets_enabled: toBool(
      source.secrets_enabled,
      DEFAULT_ANALYSIS_POLICY.secrets_enabled
    ),
    quality_enabled: toBool(
      source.quality_enabled,
      DEFAULT_ANALYSIS_POLICY.quality_enabled
    ),
    dead_code_enabled: toBool(
      source.dead_code_enabled,
      DEFAULT_ANALYSIS_POLICY.dead_code_enabled
    ),
    gate: {
      enabled: toBool(gate.enabled, DEFAULT_ANALYSIS_POLICY.gate.enabled),
      mode: GATE_MODES.includes(String(gate.mode) as GateMode)
        ? (String(gate.mode) as GateMode)
        : DEFAULT_ANALYSIS_POLICY.gate.mode,
      by_category: normalizeThresholdMap(
        gate.by_category,
        CATEGORY_KEYS,
        DEFAULT_ANALYSIS_POLICY.gate.by_category
      ),
      by_severity: normalizeThresholdMap(
        gate.by_severity,
        SEVERITY_KEYS,
        DEFAULT_ANALYSIS_POLICY.gate.by_severity
      ),
    },
  };
}

export function normalizeAnalysisPolicyInput(
  body: Record<string, unknown>,
  options: { canUseAdvancedGates: boolean }
): AnalysisPolicyConfig {
  const gate =
    body.gate && typeof body.gate === "object"
      ? (body.gate as Record<string, unknown>)
      : {};

  let mode: GateMode = GATE_MODES.includes(String(gate.mode) as GateMode)
    ? (String(gate.mode) as GateMode)
    : "zero-new";

  if (!options.canUseAdvancedGates && mode !== "zero-new") {
    mode = "zero-new";
  }

  return {
    custom_rules: toStringArray(body.custom_rules, 50),
    exclude_paths: toStringArray(body.exclude_paths, 100),
    complexity_enabled: toBool(body.complexity_enabled, true),
    complexity_threshold: toNonNegInt(body.complexity_threshold, 10),
    nesting_enabled: toBool(body.nesting_enabled, true),
    nesting_threshold: toNonNegInt(body.nesting_threshold, 4),
    function_length_enabled: toBool(body.function_length_enabled, true),
    function_length_threshold: toNonNegInt(body.function_length_threshold, 50),
    arg_count_enabled: toBool(body.arg_count_enabled, true),
    arg_count_threshold: toNonNegInt(body.arg_count_threshold, 5),
    security_enabled: toBool(body.security_enabled, true),
    secrets_enabled: toBool(body.secrets_enabled, true),
    quality_enabled: toBool(body.quality_enabled, true),
    dead_code_enabled: toBool(body.dead_code_enabled, true),
    gate: {
      enabled: toBool(gate.enabled, true),
      mode,
      by_category: normalizeThresholdMap(
        gate.by_category,
        CATEGORY_KEYS,
        DEFAULT_ANALYSIS_POLICY.gate.by_category
      ),
      by_severity: normalizeThresholdMap(
        gate.by_severity,
        SEVERITY_KEYS,
        DEFAULT_ANALYSIS_POLICY.gate.by_severity
      ),
    },
  };
}

export function mergeAnalysisPolicyConfig(
  existingConfig: PolicyConfigRecord,
  analysisPolicy: AnalysisPolicyConfig
): Record<string, unknown> {
  const base =
    existingConfig && typeof existingConfig === "object"
      ? { ...(existingConfig as Record<string, unknown>) }
      : {};

  return {
    ...base,
    ...analysisPolicy,
    gate: analysisPolicy.gate,
    custom_rules: analysisPolicy.custom_rules,
    exclude_paths: analysisPolicy.exclude_paths,
  };
}

export function resolveEffectiveAnalysisPolicy(args: {
  organizationPolicyConfig: PolicyConfigRecord;
  projectPolicyConfig: PolicyConfigRecord;
  projectPolicyInheritanceMode: unknown;
}) {
  const mode = getPolicyInheritanceMode(args.projectPolicyInheritanceMode);
  return mode === "inherit"
    ? readAnalysisPolicyConfig(args.organizationPolicyConfig)
    : readAnalysisPolicyConfig(args.projectPolicyConfig);
}

export function resolveEffectiveAiAssuranceEnabled(args: {
  organizationAiAssuranceEnabled: boolean | null | undefined;
  projectAiAssuranceEnabled: boolean | null | undefined;
  projectPolicyInheritanceMode: unknown;
}) {
  const mode = getPolicyInheritanceMode(args.projectPolicyInheritanceMode);
  return mode === "inherit"
    ? args.organizationAiAssuranceEnabled === true
    : args.projectAiAssuranceEnabled === true;
}
