import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";


if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized", code: "NO_TOKEN" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    const { data: project, error: projError } = await supabase
      .from("projects")
      .select("id, name, policy_config, strict_mode, organizations(plan)")
      .eq("api_key", token)
      .single();

    if (projError || !project) {
      return NextResponse.json(
        { error: "Invalid token", code: "INVALID_TOKEN" },
        { status: 403 }
      );
    }

    const pc = (project.policy_config ?? {}) as Record<string, any>;
    const gate = (pc.gate ?? {}) as Record<string, any>;

    const orgRef = (project as any).organizations;
    const plan = String(
      (Array.isArray(orgRef) ? orgRef?.[0]?.plan : orgRef?.plan) || "free"
    );

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