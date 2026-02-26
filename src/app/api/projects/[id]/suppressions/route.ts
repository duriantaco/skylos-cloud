import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // FIX: verify org membership via project lookup
  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const auth = await requirePermission(supabase, "view:findings", project.org_id);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const includeRevoked = url.searchParams.get("includeRevoked") === "true";

  let query = supabase
    .from("finding_suppressions")
    .select("project_id, rule_id, file_path, line_number, reason, created_at, created_by, expires_at, revoked_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (!includeRevoked) {
    query = query.is("revoked_at", null);
  }

  const { data, error } = await query;

  if (error)
    return serverError(error, "Fetch suppressions");

  return NextResponse.json({ rows: data || [] });
}
