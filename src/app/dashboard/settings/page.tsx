import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  FolderOpen,
  Hash,
  Key,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react";

import { ensureWorkspace, getProject, getUserProjects } from "@/lib/ensureWorkspace";
import { isAuthError, requirePermission } from "@/lib/permissions";
import ApiKeySection from "@/components/settings/ApiKeySection";
import PolicyEditor from "@/components/settings/PolicyEditor";
import ProjectSwitcher from "@/components/settings/ProjectSwitcher";
import SlackIntegration from "@/components/settings/SlackIntegration";
import DiscordIntegration from "@/components/settings/DiscordIntegration";
import TeamMembers from "@/components/settings/TeamMembers";
import { getEffectivePlan } from "@/lib/entitlements";
import DevPlanToggle from "@/components/settings/DevPlanToggle";
import GitHubAppInstall from "@/components/settings/GitHubAppInstall";
import RepoUrlEditor from "@/components/settings/RepoUrlEditor";
import PolicyInheritanceModeAction from "@/components/settings/PolicyInheritanceModeAction";
import { requirePlan } from "@/lib/require-credits";
import {
  getPolicyInheritanceMode,
  mergeAnalysisPolicyConfig,
  readAnalysisPolicyConfig,
  resolveEffectiveAiAssuranceEnabled,
  resolveEffectiveAnalysisPolicy,
  type AnalysisPolicyConfig,
  type ProjectPolicyInheritanceMode,
} from "@/lib/policy-config";

type EditorPolicyConfig = AnalysisPolicyConfig & {
  ai_assurance_enabled?: boolean;
};

type ProjectListItem = {
  id: string;
  name: string;
  repo_url?: string | null;
  policy_config?: Record<string, unknown> | null;
  policy_inheritance_mode?: string | null;
  ai_assurance_enabled?: boolean | null;
};

async function setProjectPolicyInheritance(formData: FormData) {
  "use server";

  const projectId = String(formData.get("projectId") || "");
  const nextMode = getPolicyInheritanceMode(formData.get("mode"));
  const errorRedirect = (message: string) =>
    redirect(
      `/dashboard/settings?project=${projectId}&policyError=${encodeURIComponent(
        message
      )}`
    );

  if (!projectId) return;

  const { user, supabase } = await ensureWorkspace();
  if (!user) return redirect("/login");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      "id, org_id, policy_config, policy_inheritance_mode, ai_assurance_enabled"
    )
    .eq("id", projectId)
    .single();

  if (projectError) {
    return errorRedirect("Failed to load the current project policy.");
  }

  if (!project) {
    return redirect("/dashboard/settings");
  }

  const auth = await requirePermission(supabase, "manage:settings", project.org_id);
  if (isAuthError(auth)) {
    return redirect(`/dashboard/settings?project=${projectId}`);
  }

  const currentMode = getPolicyInheritanceMode(project.policy_inheritance_mode);
  if (currentMode === nextMode) {
    revalidatePath("/dashboard/settings");
    return redirect(`/dashboard/settings?project=${projectId}`);
  }

  if (nextMode === "custom") {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("plan, pro_expires_at, policy_config, ai_assurance_enabled")
      .eq("id", project.org_id)
      .single();

    if (orgError || !org) {
      return errorRedirect("Failed to load the workspace baseline.");
    }

    const effectivePlan = getEffectivePlan({
      plan: org.plan || "free",
      pro_expires_at: org.pro_expires_at,
    });
    const planCheck = requirePlan(
      effectivePlan,
      "pro",
      "Workspace policy governance"
    );
    if (!planCheck.ok) {
      return errorRedirect(
        "Workspace Governance requires paid workspace access."
      );
    }

    const inheritedPolicy = readAnalysisPolicyConfig(
      (org?.policy_config as Record<string, unknown> | null) ?? null
    );

    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update({
        policy_inheritance_mode: "custom",
        policy_config: mergeAnalysisPolicyConfig(
          (project.policy_config as Record<string, unknown> | null) ?? null,
          inheritedPolicy
        ),
        ai_assurance_enabled: org?.ai_assurance_enabled === true,
      })
      .eq("id", projectId)
      .eq("policy_inheritance_mode", "inherit")
      .select("id")
      .maybeSingle();

    if (updateError) {
      return errorRedirect("Failed to create the project override.");
    }

    if (!updatedProject) {
      return errorRedirect(
        "This project policy changed while you were editing it. Refresh and try again."
      );
    }
  } else {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("plan, pro_expires_at")
      .eq("id", project.org_id)
      .single();

    if (orgError || !org) {
      return errorRedirect("Failed to load the workspace plan.");
    }

    const effectivePlan = getEffectivePlan({
      plan: org.plan || "free",
      pro_expires_at: org.pro_expires_at,
    });
    const planCheck = requirePlan(
      effectivePlan,
      "pro",
      "Workspace policy governance"
    );
    if (!planCheck.ok) {
      return errorRedirect(
        "Workspace Governance requires paid workspace access."
      );
    }

    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update({ policy_inheritance_mode: "inherit" })
      .eq("id", projectId)
      .eq("policy_inheritance_mode", "custom")
      .select("id")
      .maybeSingle();

    if (updateError) {
      return errorRedirect("Failed to revert this project to the workspace baseline.");
    }

    if (!updatedProject) {
      return errorRedirect(
        "This project policy changed while you were editing it. Refresh and try again."
      );
    }
  }

  revalidatePath("/dashboard/settings");
  redirect(`/dashboard/settings?project=${projectId}`);
}

function toEditorConfig(
  analysisPolicy: AnalysisPolicyConfig,
  aiAssuranceEnabled: boolean
): EditorPolicyConfig {
  return {
    ...analysisPolicy,
    ai_assurance_enabled: aiAssuranceEnabled,
  };
}

function isPaidGovernancePlan(plan: string) {
  return ["pro", "enterprise"].includes(plan);
}

function describePolicyDifferences(args: {
  baseline: AnalysisPolicyConfig;
  override: AnalysisPolicyConfig;
  baselineAiAssuranceEnabled: boolean;
  overrideAiAssuranceEnabled: boolean;
}) {
  const diffs: string[] = [];

  if (
    args.baseline.gate.enabled !== args.override.gate.enabled ||
    args.baseline.gate.mode !== args.override.gate.mode ||
    JSON.stringify(args.baseline.gate.by_category) !==
      JSON.stringify(args.override.gate.by_category) ||
    JSON.stringify(args.baseline.gate.by_severity) !==
      JSON.stringify(args.override.gate.by_severity)
  ) {
    diffs.push("gate");
  }

  if (
    args.baseline.complexity_enabled !== args.override.complexity_enabled ||
    args.baseline.complexity_threshold !== args.override.complexity_threshold ||
    args.baseline.nesting_enabled !== args.override.nesting_enabled ||
    args.baseline.nesting_threshold !== args.override.nesting_threshold ||
    args.baseline.function_length_enabled !==
      args.override.function_length_enabled ||
    args.baseline.function_length_threshold !==
      args.override.function_length_threshold ||
    args.baseline.arg_count_enabled !== args.override.arg_count_enabled ||
    args.baseline.arg_count_threshold !== args.override.arg_count_threshold
  ) {
    diffs.push("quality thresholds");
  }

  if (
    args.baseline.security_enabled !== args.override.security_enabled ||
    args.baseline.secrets_enabled !== args.override.secrets_enabled ||
    args.baseline.quality_enabled !== args.override.quality_enabled ||
    args.baseline.dead_code_enabled !== args.override.dead_code_enabled
  ) {
    diffs.push("scan categories");
  }

  if (
    JSON.stringify(args.baseline.exclude_paths) !==
    JSON.stringify(args.override.exclude_paths)
  ) {
    diffs.push("exclude paths");
  }

  if (
    JSON.stringify(args.baseline.custom_rules) !==
    JSON.stringify(args.override.custom_rules)
  ) {
    diffs.push("custom rules");
  }

  if (
    args.baselineAiAssuranceEnabled !== args.overrideAiAssuranceEnabled
  ) {
    diffs.push("AI assurance");
  }

  return diffs;
}

function PlanPanel({ userPlan }: { userPlan: string }) {
  const paid = ["pro", "enterprise"].includes(userPlan);

  return (
    <div
      className={`rounded-xl p-6 border-2 ${
        paid
          ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold mb-1">
            Organization Plan:
            <span
              className={`ml-2 px-3 py-1 rounded-full text-sm ${
                paid ? "bg-gray-700 text-white" : "bg-slate-600 text-white"
              }`}
            >
              {userPlan === "enterprise"
                ? "Enterprise"
                : userPlan === "pro"
                  ? "Workspace"
                  : "Free"}
            </span>
          </h3>
          <p className="text-sm text-slate-600">
            {paid
              ? "All features unlocked across all projects. Quality gates will block bad code."
              : "Get notified about issues but can't block commits."}
          </p>
        </div>

        {!paid && (
          <div className="flex items-center gap-3">
            <a
              href="mailto:founder@skylos.dev"
              className="px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition text-sm"
            >
              Book a Demo
            </a>
            <a
              href="/dashboard/billing"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-indigo-700 text-sm"
            >
              Buy Credits
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function PolicyModeBadge({
  mode,
}: {
  mode: ProjectPolicyInheritanceMode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        mode === "inherit"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      {mode === "inherit" ? "Inherits baseline" : "Custom override"}
    </span>
  );
}

function SettingsErrorNotice({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      {message}
    </div>
  );
}

function PolicySnapshot({
  title,
  description,
  config,
  aiAssuranceEnabled,
}: {
  title: string;
  description: string;
  config: AnalysisPolicyConfig;
  aiAssuranceEnabled: boolean;
}) {
  const enabledCategories = [
    config.security_enabled,
    config.secrets_enabled,
    config.quality_enabled,
    config.dead_code_enabled,
  ].filter(Boolean).length;

  const gateModeLabel = !config.gate.enabled
    ? "Disabled"
    : config.gate.mode === "zero-new"
      ? "Zero-new"
      : config.gate.mode === "category"
        ? "Category thresholds"
        : config.gate.mode === "severity"
          ? "Severity thresholds"
          : "Category + severity";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-white p-2 shadow-sm border border-slate-200">
          <Shield className="h-4 w-4 text-slate-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Gate
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{gateModeLabel}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Scan Categories
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {enabledCategories} enabled
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            AI Assurance
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {aiAssuranceEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Excluded Paths
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {config.exclude_paths.length}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Custom Rules
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {config.custom_rules.length}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Thresholds
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            C{config.complexity_threshold}, N{config.nesting_threshold}, F
            {config.function_length_threshold}, A{config.arg_count_threshold}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspacePolicySection({
  canManageSettings,
  canEdit,
  orgId,
  plan,
  initialConfig,
}: {
  canManageSettings: boolean;
  canEdit: boolean;
  orgId: string;
  plan: string;
  initialConfig: EditorPolicyConfig;
}) {
  return (
    <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg">
          <Building2 className="w-5 h-5 text-slate-700" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Workspace baseline policy</h2>
          <p className="text-slate-500 text-sm mt-1">
            Define the default analysis policy that new and inheriting projects use.
          </p>
        </div>
      </div>

      {canEdit ? (
        <PolicyEditor
          key={`org-${orgId}`}
          initialConfig={initialConfig}
          initialExcludePaths={initialConfig.exclude_paths}
          organizationId={orgId}
          scope="organization"
          plan={plan}
          saveLabel="Save workspace baseline"
        />
      ) : (
        <div className="space-y-4">
          <PolicySnapshot
            title="Workspace baseline"
            description={
              canManageSettings
                ? "Workspace baseline policy is part of the paid governance surface."
                : "Only admins and owners can edit the workspace baseline."
            }
            config={initialConfig}
            aiAssuranceEnabled={initialConfig.ai_assurance_enabled === true}
          />
          {canManageSettings && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
              Workspace Governance gives you one baseline across repos, controlled project overrides, and a shared exception trail in the web app.
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="/workspace-governance"
                  className="inline-flex rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  See Workspace Governance
                </a>
                <a
                  href="/dashboard/billing"
                  className="inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Unlock workspace governance
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function NoWorkspaceState() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Workspace Not Found</h2>
          <p className="text-slate-600 mb-6">
            We couldn&apos;t find or create your workspace. Please try logging out and back in.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function SettingsLoadErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="rounded-xl border border-red-200 bg-white p-8">
          <h1 className="text-xl font-bold text-slate-900">Settings unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
}

function NoProjectsState({
  userPlan,
  canManageSettings,
  canEditPolicyGovernance,
  orgId,
  orgPolicyConfig,
}: {
  userPlan: string;
  canManageSettings: boolean;
  canEditPolicyGovernance: boolean;
  orgId: string;
  orgPolicyConfig: EditorPolicyConfig;
}) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-bold mb-2 text-slate-900">Settings</h1>
          <p className="text-slate-500">
            Manage workspace defaults and project-level policy inheritance.
          </p>
        </div>

        <PlanPanel userPlan={userPlan} />

        <DevPlanToggle currentPlan={userPlan} />

        <WorkspacePolicySection
          canManageSettings={canManageSettings}
          canEdit={canEditPolicyGovernance}
          orgId={orgId}
          plan={userPlan}
          initialConfig={orgPolicyConfig}
        />

        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No Projects Yet</h2>
          <p className="text-slate-600 mb-6">
            Configure the workspace baseline now, then create a project that inherits it.
          </p>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            Create Project
          </Link>
        </div>
      </div>
    </div>
  );
}

function WorkspaceSettingsHome({
  projects,
  userPlan,
  canManageSettings,
  canEditPolicyGovernance,
  orgId,
  orgPolicyConfig,
}: {
  projects: ProjectListItem[];
  userPlan: string;
  canManageSettings: boolean;
  canEditPolicyGovernance: boolean;
  orgId: string;
  orgPolicyConfig: EditorPolicyConfig;
}) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-bold mb-2 text-slate-900">Settings</h1>
          <p className="text-slate-500">
            Define the workspace baseline, then choose which projects inherit it or use a project override.
          </p>
        </div>

        <PlanPanel userPlan={userPlan} />
        <DevPlanToggle currentPlan={userPlan} />

        <WorkspacePolicySection
          canManageSettings={canManageSettings}
          canEdit={canEditPolicyGovernance}
          orgId={orgId}
          plan={userPlan}
          initialConfig={orgPolicyConfig}
        />

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-900">Project inheritance</h2>
            <p className="text-sm text-slate-500 mt-1">
              Pick a project to keep inheriting the workspace baseline or switch it to a custom override.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {projects.map((project) => {
              const mode = getPolicyInheritanceMode(project.policy_inheritance_mode);
              const projectOverridePolicy = readAnalysisPolicyConfig(
                project.policy_config ?? null
              );
              const projectOverrideDiffs =
                mode === "custom"
                  ? describePolicyDifferences({
                      baseline: orgPolicyConfig,
                      override: projectOverridePolicy,
                      baselineAiAssuranceEnabled:
                        orgPolicyConfig.ai_assurance_enabled === true,
                      overrideAiAssuranceEnabled:
                        project.ai_assurance_enabled === true,
                    })
                  : [];
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/settings?project=${project.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-slate-900">{project.name}</div>
                      <PolicyModeBadge mode={mode} />
                    </div>
                    {project.repo_url && (
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        {project.repo_url}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-slate-500">
                      {mode === "inherit"
                        ? "Uses the workspace baseline for new scans."
                        : projectOverrideDiffs.length > 0
                          ? `Override changes: ${projectOverrideDiffs.join(", ")}.`
                          : "Override is active, but it currently matches the workspace baseline."}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition">
                    Configure
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; policyError?: string }>;
}) {
  const { user, orgId, supabase } = await ensureWorkspace();

  if (!user) {
    redirect("/login");
  }

  if (!orgId) {
    return <NoWorkspaceState />;
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("name, plan, pro_expires_at, policy_config, ai_assurance_enabled")
    .eq("id", orgId)
    .single();

  if (orgError) {
    return (
      <SettingsLoadErrorState message="We couldn't load the workspace policy settings. If a migration just ran, refresh once it completes." />
    );
  }

  const userPlan = getEffectivePlan({
    plan: org?.plan || "free",
    pro_expires_at: org?.pro_expires_at,
  });

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const userRole = membership?.role || "member";
  const canManageSettings = ["admin", "owner"].includes(userRole);
  const canEditPolicyGovernance =
    canManageSettings && isPaidGovernancePlan(userPlan);

  let projects: ProjectListItem[] = [];
  try {
    projects = (await getUserProjects(supabase, orgId)) as ProjectListItem[];
  } catch {
    return (
      <SettingsLoadErrorState message="We couldn't load the project inheritance list. If the policy migration is still running, wait for it to finish and refresh." />
    );
  }
  const orgAnalysisPolicy = readAnalysisPolicyConfig(
    (org?.policy_config as Record<string, unknown> | null) ?? null
  );
  const orgPolicyConfig = toEditorConfig(
    orgAnalysisPolicy,
    org?.ai_assurance_enabled === true
  );

  if (!projects || projects.length === 0) {
    return (
      <NoProjectsState
        userPlan={userPlan}
        canManageSettings={canManageSettings}
        canEditPolicyGovernance={canEditPolicyGovernance}
        orgId={orgId}
        orgPolicyConfig={orgPolicyConfig}
      />
    );
  }

  const params = await searchParams;
  const projectId = params.project;
  const policyError = params.policyError;

  if (!projectId) {
    return (
      <WorkspaceSettingsHome
        projects={projects}
        userPlan={userPlan}
        canManageSettings={canManageSettings}
        canEditPolicyGovernance={canEditPolicyGovernance}
        orgId={orgId}
        orgPolicyConfig={orgPolicyConfig}
      />
    );
  }

  let project: Awaited<ReturnType<typeof getProject>> | null = null;
  try {
    project = await getProject(supabase, projectId, orgId);
  } catch {
    return (
      <SettingsLoadErrorState message="We couldn't load this project's policy configuration. If the schema rollout is still in progress, refresh after it completes." />
    );
  }

  if (!project) {
    return (
      <WorkspaceSettingsHome
        projects={projects}
        userPlan={userPlan}
        canManageSettings={canManageSettings}
        canEditPolicyGovernance={canEditPolicyGovernance}
        orgId={orgId}
        orgPolicyConfig={orgPolicyConfig}
      />
    );
  }

  const projectPolicyConfigRaw =
    (project.policy_config as Record<string, unknown> | null) ?? null;
  const projectCustomPolicy = readAnalysisPolicyConfig(projectPolicyConfigRaw);
  const inheritanceMode = getPolicyInheritanceMode(project.policy_inheritance_mode);
  const effectivePolicy = resolveEffectiveAnalysisPolicy({
    organizationPolicyConfig: (org?.policy_config as Record<string, unknown> | null) ?? null,
    projectPolicyConfig: projectPolicyConfigRaw,
    projectPolicyInheritanceMode: project.policy_inheritance_mode,
  });
  const effectiveAiAssuranceEnabled = resolveEffectiveAiAssuranceEnabled({
    organizationAiAssuranceEnabled: org?.ai_assurance_enabled === true,
    projectAiAssuranceEnabled: project.ai_assurance_enabled === true,
    projectPolicyInheritanceMode: project.policy_inheritance_mode,
  });
  const projectCustomEditorConfig = toEditorConfig(
    projectCustomPolicy,
    project.ai_assurance_enabled === true
  );
  const projectOverrideDiffs = describePolicyDifferences({
    baseline: orgAnalysisPolicy,
    override: projectCustomPolicy,
    baselineAiAssuranceEnabled: org?.ai_assurance_enabled === true,
    overrideAiAssuranceEnabled: project.ai_assurance_enabled === true,
  });
  const githubAutoConfigureEnabled =
    projectPolicyConfigRaw?.github_auto_configure_on_install === true;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/dashboard/settings"
          className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-8 text-sm font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>

        <h1 className="text-2xl font-bold mb-2 text-slate-900">
          Project Settings: {project.name}
        </h1>
        <p className="text-slate-500 mb-6">
          Manage repository settings and decide whether this project inherits the workspace baseline or uses a project override.
        </p>

        <ProjectSwitcher projects={projects} selectedProjectId={project.id} />

        <RepoUrlEditor
          projectId={project.id}
          currentUrl={project.repo_url}
          githubInstallationId={project.github_installation_id}
        />

        <GitHubAppInstall
          currentPlan={userPlan}
          githubInstallationId={project.github_installation_id}
          repoUrl={project.repo_url}
          projectId={project.id}
          autoConfigureEnabled={githubAutoConfigureEnabled}
          canManageSettings={canManageSettings}
        />

        <div className="mb-8">
          <PlanPanel userPlan={userPlan} />
        </div>

        <SettingsErrorNotice message={policyError} />

        <div className="space-y-8">
          <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
                <Shield className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Analysis Configuration
                  </h2>
                  <PolicyModeBadge mode={inheritanceMode} />
                </div>
                <p className="text-slate-500 text-sm mt-1">
                  Workspace baseline and project overrides use one explicit inheritance model.
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {inheritanceMode === "inherit"
                      ? "This project inherits the workspace baseline."
                      : "This project uses a project-specific override."}
                  </div>
                  <p className="text-sm text-slate-500">
                    {inheritanceMode === "inherit"
                      ? "Changes to the workspace baseline become the effective policy for fresh syncs and server-side gate evaluation. Local CLI runs still need skylos sync pull."
                      : projectOverrideDiffs.length > 0
                        ? `Override changes versus baseline: ${projectOverrideDiffs.join(", ")}.`
                        : "Override is active, but it currently matches the workspace baseline."}
                  </p>
                </div>
                {canEditPolicyGovernance ? (
                  <PolicyInheritanceModeAction
                    action={setProjectPolicyInheritance}
                    projectId={project.id}
                    nextMode={inheritanceMode === "inherit" ? "custom" : "inherit"}
                    label={
                      inheritanceMode === "inherit"
                        ? "Create project override"
                        : "Revert to workspace baseline"
                    }
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  />
                ) : (
                  <a
                    href="/dashboard/billing"
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Unlock workspace governance
                  </a>
                )}
              </div>
            </div>

            {!canEditPolicyGovernance ? (
              <div className="space-y-4">
                <PolicySnapshot
                  title={
                    inheritanceMode === "inherit"
                      ? "Effective policy from workspace baseline"
                      : "Current project override"
                  }
                  description="Project inheritance and controlled overrides are part of Workspace Governance."
                  config={
                    inheritanceMode === "inherit" ? effectivePolicy : projectCustomPolicy
                  }
                  aiAssuranceEnabled={
                    inheritanceMode === "inherit"
                      ? effectiveAiAssuranceEnabled
                      : project.ai_assurance_enabled === true
                  }
                />
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
                  Unlock Workspace Governance to manage one baseline across repos, switch inheritance modes, and keep project-specific overrides visible.
                </div>
              </div>
            ) : inheritanceMode === "inherit" ? (
              <PolicySnapshot
                title="Effective policy from workspace baseline"
                description="This project is read-only here until you switch it to a custom override."
                config={effectivePolicy}
                aiAssuranceEnabled={effectiveAiAssuranceEnabled}
              />
            ) : (
              <PolicyEditor
                key={`project-${project.id}-${inheritanceMode}`}
                initialConfig={projectCustomEditorConfig}
                initialExcludePaths={projectCustomEditorConfig.exclude_paths}
                projectId={project.id}
                scope="project"
                plan={userPlan}
                saveLabel="Save project override"
              />
            )}
          </section>

          <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Team</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Manage team members and their roles.
                </p>
              </div>
            </div>

            <TeamMembers
              currentUserId={user.id}
              currentUserRole={userRole}
              plan={userPlan}
            />
          </section>

          {canManageSettings && (
            <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <Key className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">API Configuration</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Use this token to authenticate your CLI and CI/CD pipelines for{" "}
                    <strong>{project.name}</strong>.
                  </p>
                </div>
              </div>

              <ApiKeySection projectId={project.id} />
            </section>
          )}

          {canManageSettings && (
            <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Slack Integration</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Get notified in Slack when quality gates fail or recover.
                  </p>
                </div>
              </div>

              {["pro", "enterprise"].includes(userPlan) ? (
                <SlackIntegration projectId={project.id} />
              ) : (
                <div className="relative opacity-50 pointer-events-none">
                  <SlackIntegration projectId={project.id} />
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                    <div className="text-center">
                      <p className="font-semibold mb-2">Workspace Feature</p>
                      <a
                        href="/dashboard/billing"
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm"
                      >
                        Unlock paid workspace
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {canManageSettings && (
            <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <Hash className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Discord Integration</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Get notified in Discord when quality gates fail or recover.
                  </p>
                </div>
              </div>

              {["pro", "enterprise"].includes(userPlan) ? (
                <DiscordIntegration projectId={project.id} />
              ) : (
                <div className="relative opacity-50 pointer-events-none">
                  <DiscordIntegration projectId={project.id} />
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                    <div className="text-center">
                      <p className="font-semibold mb-2">Workspace Feature</p>
                      <a
                        href="/dashboard/billing"
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm"
                      >
                        Unlock paid workspace
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
