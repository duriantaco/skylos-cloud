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
  advancedGateModesEnabled: boolean;
  inlinePrCommentsEnabled: boolean;
  teamCollaborationEnabled: boolean;
  integrationsEnabled: boolean;
  complianceEnabled: boolean;
  suppressionGovernanceEnabled: boolean;
  fullTrendsEnabled: boolean;
  exportsEnabled: boolean;
  customRulesMax: number;
  maxSuppressionsPerProject: number;
};

export const PLAN_CAPABILITIES: Record<Plan, PlanCapabilities> = {
  free: {
    maxScansStored: 10,
    maxProjectsAllowed: 1,
    prDiffEnabled: false,
    suppressionsEnabled: true,
    overridesEnabled: false,
    checkRunsEnabled: true,
    sarifEnabled: false,
    apiRateLimitPerHour: 20,
    historyRetentionDays: 7,
    advancedGateModesEnabled: false,
    inlinePrCommentsEnabled: false,
    teamCollaborationEnabled: false,
    integrationsEnabled: false,
    complianceEnabled: false,
    suppressionGovernanceEnabled: false,
    fullTrendsEnabled: false,
    exportsEnabled: false,
    customRulesMax: 3,
    maxSuppressionsPerProject: 25,
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
    advancedGateModesEnabled: true,
    inlinePrCommentsEnabled: true,
    teamCollaborationEnabled: true,
    integrationsEnabled: true,
    complianceEnabled: true,
    suppressionGovernanceEnabled: true,
    fullTrendsEnabled: true,
    exportsEnabled: true,
    customRulesMax: 50,
    maxSuppressionsPerProject: 999999,
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
    advancedGateModesEnabled: true,
    inlinePrCommentsEnabled: true,
    teamCollaborationEnabled: true,
    integrationsEnabled: true,
    complianceEnabled: true,
    suppressionGovernanceEnabled: true,
    fullTrendsEnabled: true,
    exportsEnabled: true,
    customRulesMax: 999999,
    maxSuppressionsPerProject: 999999,
  },
};

/**
 * Resolves the effective plan based on pro_expires_at.
 * Pro is time-bound — if expired, reverts to free.
 * Enterprise is always enterprise.
 */
export function getEffectivePlan(org: { plan: string; pro_expires_at?: string | null }): Plan {
  if (org.plan === "enterprise") return "enterprise";
  if (org.plan === "pro" && org.pro_expires_at && new Date(org.pro_expires_at) > new Date()) return "pro";
  return "free";
}

export function getCapabilities(plan: string): PlanCapabilities {
  if (plan === "enterprise") return PLAN_CAPABILITIES.enterprise;
  if (plan === "pro") return PLAN_CAPABILITIES.pro;
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

export function canUseAdvancedGates(plan: Plan): boolean {
  return getCapabilities(plan).advancedGateModesEnabled;
}

export function canUseInlinePrComments(plan: Plan): boolean {
  return getCapabilities(plan).inlinePrCommentsEnabled;
}

export function canUseTeam(plan: Plan): boolean {
  return getCapabilities(plan).teamCollaborationEnabled;
}

export function canUseIntegrations(plan: Plan): boolean {
  return getCapabilities(plan).integrationsEnabled;
}

export function canUseCompliance(plan: Plan): boolean {
  return getCapabilities(plan).complianceEnabled;
}

export function canUseSuppressionGovernance(plan: Plan): boolean {
  return getCapabilities(plan).suppressionGovernanceEnabled;
}

export function canViewFullTrends(plan: Plan): boolean {
  return getCapabilities(plan).fullTrendsEnabled;
}

export function canExport(plan: Plan): boolean {
  return getCapabilities(plan).exportsEnabled;
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
    { name: "Advanced gate modes", enabled: caps.advancedGateModesEnabled },
    { name: "Inline PR comments", enabled: caps.inlinePrCommentsEnabled },
    { name: "Team collaboration", enabled: caps.teamCollaborationEnabled },
    { name: "Slack/Discord integrations", enabled: caps.integrationsEnabled },
    { name: "Compliance reports", enabled: caps.complianceEnabled },
    { name: "Full trends & analytics", enabled: caps.fullTrendsEnabled },
    { name: "Findings export", enabled: caps.exportsEnabled },
  ];
}
