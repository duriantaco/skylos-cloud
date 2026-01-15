export type Plan = "free" | "pro" | "enterprise";

export type PlanCapabilities = {
  maxScansStored: number;
  maxProjectsAllowed: number;
  prDiffEnabled: boolean;
  suppressionsEnabled: boolean;
  overridesEnabled: boolean;
  checkRunsEnabled: boolean;
  sarifEnabled: boolean;
  apiRateLimitPerHour: number;
  historyRetentionDays: number;
};

export const PLAN_CAPABILITIES: Record<Plan, PlanCapabilities> = {
  free: {
    maxScansStored: 10,
    maxProjectsAllowed: 1,
    prDiffEnabled: false,
    suppressionsEnabled: false,
    overridesEnabled: false,
    checkRunsEnabled: false,
    sarifEnabled: false,
    apiRateLimitPerHour: 20,
    historyRetentionDays: 7,
  },
  pro: {
    maxScansStored: 500,
    maxProjectsAllowed: 10,
    prDiffEnabled: true,
    suppressionsEnabled: true,
    overridesEnabled: true,
    checkRunsEnabled: true,
    sarifEnabled: true,
    apiRateLimitPerHour: 500,
    historyRetentionDays: 90,
  },
  enterprise: {
    maxScansStored: 10000,
    maxProjectsAllowed: 9999,
    prDiffEnabled: true,
    suppressionsEnabled: true,
    overridesEnabled: true,
    checkRunsEnabled: true,
    sarifEnabled: true,
    apiRateLimitPerHour: 5000,
    historyRetentionDays: 365,
  },
};

export function getCapabilities(plan: string): PlanCapabilities {
  if (plan === "enterprise") 
    return PLAN_CAPABILITIES.enterprise;
  if (plan === "pro") 
    return PLAN_CAPABILITIES.pro;
  return PLAN_CAPABILITIES.free;
}

export function canUseSarif(plan: Plan): boolean {
  return getCapabilities(plan).sarifEnabled;
}

export function canUseUnlimitedHistory(plan: Plan): boolean {
  return plan !== "free";
}

export function projectLimit(plan: Plan): number {
  return getCapabilities(plan).maxProjectsAllowed;
}

export function canUsePrDiff(plan: Plan): boolean {
  return getCapabilities(plan).prDiffEnabled;
}

export function canUseSuppression(plan: Plan): boolean {
  return getCapabilities(plan).suppressionsEnabled;
}

export function canUseOverride(plan: Plan): boolean {
  return getCapabilities(plan).overridesEnabled;
}

export function canUseCheckRuns(plan: Plan): boolean {
  return getCapabilities(plan).checkRunsEnabled;
}

export function getPlanFeatures(plan: Plan): { name: string; enabled: boolean }[] {
  const caps = getCapabilities(plan);
  return [
    { name: "Local CLI scanning", enabled: true },
    { name: "Quality gate", enabled: true },
    { name: `Up to ${caps.maxScansStored} scans stored`, enabled: true },
    { name: `${caps.maxProjectsAllowed} project${caps.maxProjectsAllowed > 1 ? 's' : ''}`, enabled: true },
    { name: "PR diff analysis", enabled: caps.prDiffEnabled },
    { name: "Suppressions", enabled: caps.suppressionsEnabled },
    { name: "Override gate", enabled: caps.overridesEnabled },
    { name: "GitHub check runs", enabled: caps.checkRunsEnabled },
    { name: "SARIF import", enabled: caps.sarifEnabled },
    { name: `${caps.historyRetentionDays} day history`, enabled: true },
  ];
}