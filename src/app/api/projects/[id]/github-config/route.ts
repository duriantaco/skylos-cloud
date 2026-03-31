import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { isAuthError, requirePermission } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { mergeGitHubAutoConfigureSetting } from "@/lib/github-installation-core";
import { requirePlan } from "@/lib/require-credits";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const enabled = body?.autoConfigureOnInstall;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "autoConfigureOnInstall must be a boolean" },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, org_id, policy_config")
      .eq("id", id)
      .single();

    if (projectError) {
      return serverError(projectError, "Load GitHub settings");
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const auth = await requirePermission(supabase, "manage:settings", project.org_id);
    if (isAuthError(auth)) return auth;

    if (enabled) {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("plan, pro_expires_at")
        .eq("id", project.org_id)
        .single();

      if (orgError) {
        return serverError(orgError, "Load organization plan");
      }

      const plan = getEffectivePlan({
        plan: org?.plan || "free",
        pro_expires_at: org?.pro_expires_at,
      });
      const planCheck = requirePlan(
        plan,
        "pro",
        "GitHub auto-configuration"
      );

      if (!planCheck.ok) {
        return planCheck.response;
      }
    }

    const policyConfig =
      project.policy_config && typeof project.policy_config === "object"
        ? (project.policy_config as Record<string, unknown>)
        : {};

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        policy_config: mergeGitHubAutoConfigureSetting(policyConfig, enabled),
      })
      .eq("id", id);

    if (updateError) {
      return serverError(updateError, "Update GitHub settings");
    }

    return NextResponse.json({
      success: true,
      github_auto_configure_on_install: enabled,
    });
  } catch (e: unknown) {
    return serverError(e, "Update GitHub settings");
  }
}
