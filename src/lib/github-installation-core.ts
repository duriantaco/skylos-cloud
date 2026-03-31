import { getEffectivePlan } from "./entitlements";

type PolicyConfig = Record<string, unknown> | null | undefined;
type OrgPlanState =
  | {
      plan?: string | null;
      pro_expires_at?: string | null;
    }
  | null
  | undefined;

export function isGitHubAutoConfigureEnabled(
  policyConfig: PolicyConfig,
  envEnabled: boolean
): boolean {
  if (!envEnabled) {
    return false;
  }

  return policyConfig?.github_auto_configure_on_install === true;
}

export function mergeGitHubAutoConfigureSetting(
  policyConfig: PolicyConfig,
  enabled: boolean
): Record<string, unknown> {
  return {
    ...(policyConfig ?? {}),
    github_auto_configure_on_install: enabled,
  };
}

export function canAutoConfigureGitHubInstall(
  policyConfig: PolicyConfig,
  envEnabled: boolean,
  org: OrgPlanState
): boolean {
  if (!isGitHubAutoConfigureEnabled(policyConfig, envEnabled) || !org) {
    return false;
  }

  return (
    getEffectivePlan({
      plan: org.plan || "free",
      pro_expires_at: org.pro_expires_at ?? null,
    }) !== "free"
  );
}
