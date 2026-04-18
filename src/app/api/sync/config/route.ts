import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { getEffectivePlan } from "@/lib/entitlements";
import { resolveProjectFromToken } from "@/lib/project-api-keys";
import { resolveEffectiveAnalysisPolicy } from "@/lib/policy-config";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createClient(url, key)
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { error: "Server misconfigured", code: "SERVER_MISCONFIGURED" },
        { status: 500 }
      )
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized", code: "NO_TOKEN" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    const resolved = await resolveProjectFromToken<{
      id: string;
      name: string;
      policy_config: Record<string, unknown> | null;
      policy_inheritance_mode: string | null;
      strict_mode: boolean | null;
      organizations:
        | {
            plan: string | null;
            pro_expires_at: string | null;
            policy_config: Record<string, unknown> | null;
          }
        | {
            plan: string | null;
            pro_expires_at: string | null;
            policy_config: Record<string, unknown> | null;
          }[]
        | null;
    }>(
      supabase,
      token,
      "id, name, policy_config, policy_inheritance_mode, strict_mode, organizations(plan, pro_expires_at, policy_config)"
    );

    const project = resolved?.project;

    if (!project) {
      return NextResponse.json(
        { error: "Invalid token", code: "INVALID_TOKEN" },
        { status: 403 }
      );
    }

    const orgRef = project.organizations;
    const rawPlan = String(
      (Array.isArray(orgRef) ? orgRef?.[0]?.plan : orgRef?.plan) || "free"
    );
    const proExpiresAt = Array.isArray(orgRef) ? orgRef?.[0]?.pro_expires_at : orgRef?.pro_expires_at;
    const plan = getEffectivePlan({ plan: rawPlan, pro_expires_at: proExpiresAt });
    const effectivePolicy = resolveEffectiveAnalysisPolicy({
      organizationPolicyConfig: Array.isArray(orgRef)
        ? orgRef?.[0]?.policy_config ?? null
        : orgRef?.policy_config ?? null,
      projectPolicyConfig: project.policy_config ?? null,
      projectPolicyInheritanceMode: project.policy_inheritance_mode,
    });
    const gate = effectivePolicy.gate;

    const config = {
      project_id: project.id,
      project_name: project.name,
      plan,
      strict_mode: !!project.strict_mode,

      exclude_paths: effectivePolicy.exclude_paths,

      complexity_enabled: effectivePolicy.complexity_enabled,
      complexity_threshold: effectivePolicy.complexity_threshold,
      nesting_enabled: effectivePolicy.nesting_enabled,
      nesting_threshold: effectivePolicy.nesting_threshold,
      function_length_enabled: effectivePolicy.function_length_enabled,
      function_length_threshold: effectivePolicy.function_length_threshold,
      arg_count_enabled: effectivePolicy.arg_count_enabled,
      arg_count_threshold: effectivePolicy.arg_count_threshold,
      security_enabled: effectivePolicy.security_enabled,
      secrets_enabled: effectivePolicy.secrets_enabled,
      quality_enabled: effectivePolicy.quality_enabled,
      dead_code_enabled: effectivePolicy.dead_code_enabled,

      gate: {
        enabled: gate.enabled,
        mode: gate.mode,
        by_category: gate.by_category,
        by_severity: gate.by_severity,
      },

      gate_enabled: gate.enabled,
      gate_mode: gate.mode,

      custom_rules: effectivePolicy.custom_rules,
    };

    return NextResponse.json(config);
  } catch (e) {
    return serverError(e, "Sync config");
  }
}
