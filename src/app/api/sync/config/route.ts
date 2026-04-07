import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { getEffectivePlan } from "@/lib/entitlements";
import { resolveProjectFromToken } from "@/lib/project-api-keys";

type PolicyConfig = {
  gate?: {
    enabled?: boolean;
    mode?: string;
    by_category?: Record<string, number>;
    by_severity?: Record<string, number>;
  };
  exclude_paths?: unknown[];
  complexity_enabled?: boolean;
  complexity_threshold?: number;
  nesting_enabled?: boolean;
  nesting_threshold?: number;
  function_length_enabled?: boolean;
  function_length_threshold?: number;
  arg_count_enabled?: boolean;
  arg_count_threshold?: number;
  security_enabled?: boolean;
  secrets_enabled?: boolean;
  quality_enabled?: boolean;
  dead_code_enabled?: boolean;
  custom_rules?: unknown[];
};

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
      strict_mode: boolean | null;
      organizations: { plan: string | null; pro_expires_at: string | null } | { plan: string | null; pro_expires_at: string | null }[] | null;
    }>(
      supabase,
      token,
      "id, name, policy_config, strict_mode, organizations(plan, pro_expires_at)"
    );

    const project = resolved?.project;

    if (!project) {
      return NextResponse.json(
        { error: "Invalid token", code: "INVALID_TOKEN" },
        { status: 403 }
      );
    }

    const pc = (project.policy_config ?? {}) as PolicyConfig;
    const gate = pc.gate ?? {};

    const orgRef = project.organizations;
    const rawPlan = String(
      (Array.isArray(orgRef) ? orgRef?.[0]?.plan : orgRef?.plan) || "free"
    );
    const proExpiresAt = Array.isArray(orgRef) ? orgRef?.[0]?.pro_expires_at : orgRef?.pro_expires_at;
    const plan = getEffectivePlan({ plan: rawPlan, pro_expires_at: proExpiresAt });

    const config = {
      project_id: project.id,
      project_name: project.name,
      plan,
      strict_mode: !!project.strict_mode,

      exclude_paths: Array.isArray(pc.exclude_paths) ? pc.exclude_paths : [],

      complexity_enabled: pc.complexity_enabled ?? true,
      complexity_threshold: pc.complexity_threshold ?? 10,
      nesting_enabled: pc.nesting_enabled ?? true,
      nesting_threshold: pc.nesting_threshold ?? 4,
      function_length_enabled: pc.function_length_enabled ?? true,
      function_length_threshold: pc.function_length_threshold ?? 50,
      arg_count_enabled: pc.arg_count_enabled ?? true,
      arg_count_threshold: pc.arg_count_threshold ?? 5,
      security_enabled: pc.security_enabled ?? true,
      secrets_enabled: pc.secrets_enabled ?? true,
      quality_enabled: pc.quality_enabled ?? true,
      dead_code_enabled: pc.dead_code_enabled ?? true,

      gate: {
        enabled: gate.enabled !== false,
        mode: gate.mode ?? "zero-new",
        by_category: gate.by_category ?? {
          SECURITY: 0,
          SECRET: 0,
          QUALITY: 0,
          DEAD_CODE: 0,
        },
        by_severity: gate.by_severity ?? {
          CRITICAL: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
        },
      },

      gate_enabled: gate.enabled !== false,
      gate_mode: gate.mode ?? "zero-new",

      custom_rules: Array.isArray(pc.custom_rules) ? pc.custom_rules : [],
    };

    return NextResponse.json(config);
  } catch (e) {
    return serverError(e, "Sync config");
  }
}
