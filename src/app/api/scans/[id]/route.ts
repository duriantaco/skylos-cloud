import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";


export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("id, project_id, projects(org_id)")
      .eq("id", id)
      .single();
    if (scanErr || !scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const orgId = (scan.projects as any)?.org_id;
    const auth = await requirePermission(supabase, "delete:projects", orgId);
    if (isAuthError(auth)) return auth;

    const { data: deleted, error: delErr } = await supabase
      .from("scans")
      .delete()
      .eq("id", id)
      .select("id");
    if (delErr) {
      return serverError(delErr, "Scan delete");
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: "Delete blocked by policy" }, { status: 403 });
    }

    return NextResponse.json({ success: true, deleted: deleted[0].id });

  } catch (e) {
    return serverError(e, "Scan delete");
  }
}
