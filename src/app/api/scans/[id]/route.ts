import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";


export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  try {
    const supabase = await createClient();
    const { id } = await params;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("id, project_id, projects(org_id)")
      .eq("id", id)
      .single();
    if (scanErr || !scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const orgId = (scan.projects as any)?.org_id;
    const { data: member, error: memErr } = await supabase
      .from("organization_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .single();
    if (memErr || !member) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

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
