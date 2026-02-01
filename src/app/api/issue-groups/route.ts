import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "open";
  const projectId = url.searchParams.get("project_id");
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));

  const { data: memberships, error: memberError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id);

  if (memberError || !memberships || memberships.length === 0) {
    return NextResponse.json({ error: "Not a member of any organization" }, { status: 403 });
  }

  const userOrgIds = memberships.map((m) => m.org_id);

  let q = supabase
    .from("issue_groups")
    .select(
      "id, org_id, project_id, fingerprint, rule_id, category, severity, canonical_file, canonical_line, canonical_snippet, occurrence_count, affected_files, verification_status, suggested_fix, data_flow, status, first_seen_at, last_seen_at, last_seen_scan_id"
    )
    .in("org_id", userOrgIds)
    .eq("status", status)
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (projectId) q = q.eq("project_id", projectId);

  const { data, error } = await q;
  if (error) 
    return serverError(error, "Fetch issue groups");

  return NextResponse.json({ groups: data || [] });
}