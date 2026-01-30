import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "open";
  const projectId = url.searchParams.get("project_id");
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));

  let q = supabase
    .from("issue_groups")
    .select(
      "id, org_id, project_id, fingerprint, rule_id, category, severity, canonical_file, canonical_line, canonical_snippet, occurrence_count, affected_files, verification_status, suggested_fix, data_flow, status, first_seen_at, last_seen_at, last_seen_scan_id"
    )
    .eq("status", status)
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (projectId) q = q.eq("project_id", projectId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ groups: data || [] });
}
