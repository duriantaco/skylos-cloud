import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";

export async function GET(request: Request) {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "view:findings");
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "open";
  const projectId = url.searchParams.get("project_id");
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));

  let q = supabase
    .from("issue_groups")
    .select(
      "id, org_id, project_id, fingerprint, rule_id, category, severity, canonical_file, canonical_line, canonical_snippet, occurrence_count, affected_files, verification_status, suggested_fix, data_flow, status, first_seen_at, last_seen_at, last_seen_scan_id"
    )
    .eq("org_id", auth.orgId)
    .eq("status", status)
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (projectId) q = q.eq("project_id", projectId);

  const { data, error } = await q;
  if (error)
    return serverError(error, "Fetch issue groups");

  return NextResponse.json({ groups: data || [] });
}
