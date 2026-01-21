import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

type GateMode = "zero-new" | "category" | "severity" | "both";

function toNonNegInt(v: any, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function toBool(v: any, fallback: boolean) {
  if (v === true || v === false) 
    return v;
  if (v === "true") 
    return true;
  if (v === "false") 
    return false;
  return fallback;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "");
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const incomingRules = Array.isArray(body.custom_rules) ? body.custom_rules : [];
    const custom_rules = incomingRules
      .map((x: any) => String(x ?? "").trim())
      .filter(Boolean)
      .slice(0, 50);

    const incomingPaths = Array.isArray(body.exclude_paths) ? body.exclude_paths : [];
    const exclude_paths = incomingPaths
      .map((x: any) => String(x ?? "").trim())
      .filter(Boolean)
      .slice(0, 100);

    const complexity_enabled = toBool(body.complexity_enabled, true);
    const complexity_threshold = toNonNegInt(body.complexity_threshold, 10);
    const nesting_enabled = toBool(body.nesting_enabled, true);
    const nesting_threshold = toNonNegInt(body.nesting_threshold, 4);
    const function_length_enabled = toBool(body.function_length_enabled, true);
    const function_length_threshold = toNonNegInt(body.function_length_threshold, 50);
    const arg_count_enabled = toBool(body.arg_count_enabled, true);
    const arg_count_threshold = toNonNegInt(body.arg_count_threshold, 5);

    const security_enabled = toBool(body.security_enabled, true);
    const secrets_enabled = toBool(body.secrets_enabled, true);
    const quality_enabled = toBool(body.quality_enabled, true);
    const dead_code_enabled = toBool(body.dead_code_enabled, true);

    const g = body.gate || {};
    const gate = {
      enabled: toBool(g.enabled, true),
      mode: (["zero-new", "category", "severity", "both"].includes(String(g.mode)) 
        ? String(g.mode) 
        : "zero-new") as GateMode,
      by_category: {} as Record<string, number>,
      by_severity: {} as Record<string, number>,
    };

    const defaultCats = ["SECURITY", "SECRET", "QUALITY", "DEAD_CODE"];
    const defaultSev = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

    const catObj = (g.by_category && typeof g.by_category === "object") ? g.by_category : {};
    const sevObj = (g.by_severity && typeof g.by_severity === "object") ? g.by_severity : {};

    for (const c of defaultCats) gate.by_category[c] = toNonNegInt(catObj[c], 0);
    for (const s of defaultSev) gate.by_severity[s] = toNonNegInt(sevObj[s], 0);

    const policy_config = {
      custom_rules,
      gate,
      exclude_paths,
      complexity_enabled,
      complexity_threshold,
      nesting_enabled,
      nesting_threshold,
      function_length_enabled,
      function_length_threshold,
      arg_count_enabled,
      arg_count_threshold,
      security_enabled,
      secrets_enabled,
      quality_enabled,
      dead_code_enabled,
    };

    const { error } = await supabase
      .from("projects")
      .update({ policy_config })
      .eq("id", projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, policy_config, exclude_paths });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}