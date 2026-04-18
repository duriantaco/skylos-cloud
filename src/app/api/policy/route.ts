import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { canUseAdvancedGates, getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";
import {
  readAnalysisPolicyConfig,
  mergeAnalysisPolicyConfig,
  normalizeAnalysisPolicyInput,
} from "@/lib/policy-config";

function toBool(v: unknown, fallback: boolean) {
  if (v === true || v === false) return v;
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const scope = body.scope === "organization" ? "organization" : "project";

    if (scope === "organization") {
      const organizationId = String(body.organizationId || "");
      if (!organizationId) {
        return NextResponse.json(
          { error: "Missing organizationId" },
          { status: 400 }
        );
      }

      const auth = await requirePermission(
        supabase,
        "manage:settings",
        organizationId
      );
      if (isAuthError(auth)) return auth;

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, plan, pro_expires_at")
        .eq("id", organizationId)
        .single();

      if (orgError) {
        return serverError(orgError, "Load organization policy");
      }

      if (!org) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
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
      if (!planCheck.ok) return planCheck.response;

      const policy_config = normalizeAnalysisPolicyInput(body, {
        canUseAdvancedGates: canUseAdvancedGates(effectivePlan),
      });
      const ai_assurance_enabled = toBool(body.ai_assurance_enabled, false);

      const { error } = await supabaseAdmin
        .from("organizations")
        .update({ policy_config, ai_assurance_enabled })
        .eq("id", organizationId);

      if (error) {
        return serverError(error, "Update organization policy");
      }

      return NextResponse.json({
        success: true,
        scope,
        policy_config,
        ai_assurance_enabled,
      });
    }

    const projectId = String(body.projectId || "");
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, org_id, policy_config, policy_inheritance_mode")
      .eq("id", projectId)
      .single();

    if (projectError) {
      return serverError(projectError, "Load project policy");
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const auth = await requirePermission(supabase, "manage:settings", project.org_id);
    if (isAuthError(auth)) return auth;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("plan, pro_expires_at, policy_config")
      .eq("id", project.org_id)
      .single();

    if (orgError) {
      return serverError(orgError, "Load organization plan");
    }

    const effectivePlan = getEffectivePlan({
      plan: org?.plan || "free",
      pro_expires_at: org?.pro_expires_at,
    });
    const planCheck = requirePlan(
      effectivePlan,
      "pro",
      "Workspace policy governance"
    );
    if (!planCheck.ok) return planCheck.response;

    const basePolicyConfig =
      project.policy_inheritance_mode === "inherit"
        ? mergeAnalysisPolicyConfig(
            project.policy_config as Record<string, unknown> | null,
            readAnalysisPolicyConfig(
              (org?.policy_config as Record<string, unknown> | null) ?? null
            )
          )
        : (project.policy_config as Record<string, unknown> | null);

    const analysisPolicy = normalizeAnalysisPolicyInput(body, {
      canUseAdvancedGates: canUseAdvancedGates(effectivePlan),
    });
    const policy_config = mergeAnalysisPolicyConfig(
      basePolicyConfig,
      analysisPolicy
    );
    const ai_assurance_enabled = toBool(body.ai_assurance_enabled, false);

    const { error } = await supabase
      .from("projects")
      .update({
        policy_config,
        ai_assurance_enabled,
        policy_inheritance_mode: "custom",
      })
      .eq("id", projectId);

    if (error) {
      return serverError(error, "Update project policy");
    }

    return NextResponse.json({
      success: true,
      scope,
      policy_config,
      ai_assurance_enabled,
    });
  } catch (e: unknown) {
    return serverError(e, "Policy update");
  }
}
