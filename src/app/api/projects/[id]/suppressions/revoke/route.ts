import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";

export async function POST(
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

  const auth = await requirePermission(supabase, "suppress:findings", project.org_id);
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const rule_id = String(body.rule_id || "");
  const file_path = String(body.file_path || "");
  const line_number = Number(body.line_number || 0);

  if (!rule_id || !file_path || !Number.isFinite(line_number)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabase
    .from("finding_suppressions")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: auth.user.id,
    })
    .eq("project_id", id)
    .eq("rule_id", rule_id)
    .eq("file_path", file_path)
    .eq("line_number", line_number)
    .is("revoked_at", null);

  if (error)
    return serverError(error, "Revoke suppression");

  return NextResponse.json({ success: true });
}
