import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: project } = await supabase
      .from("projects")
      .select("id, org_id")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const auth = await requirePermission(supabase, "edit:projects", project.org_id);
    if (isAuthError(auth)) return auth;

    const body = await req.json();

    const allowedUpdates: Record<string, any> = {};
    if ('repo_url' in body) {
      allowedUpdates.repo_url = body.repo_url || null;
    }

    const { error } = await supabase
      .from("projects")
      .update(allowedUpdates)
      .eq("id", id);

    if (error) {
      return serverError(error, "Update project");
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return serverError(e, "Project update");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: project } = await supabase
      .from("projects")
      .select("id, org_id")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const auth = await requirePermission(supabase, "delete:projects", project.org_id);
    if (isAuthError(auth)) return auth;

    const { data: scans } = await supabase
      .from("scans")
      .select("id")
      .eq("project_id", id);

    if (scans && scans.length > 0) {
      const scanIds = scans.map(s => s.id);
      await supabase.from("findings").delete().in("scan_id", scanIds);
      await supabase.from("finding_suppressions").delete().in("scan_id", scanIds);
    }

    await supabase.from("scans").delete().eq("project_id", id);

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      return serverError(error, "Delete project");
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return serverError(e, "Project delete");
  }
}
