import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";


export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const body = await request.json().catch(() => ({}));
    const ids = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No project IDs provided" }, { status: 400 });
    }

    if (ids.length > 50) {
      return NextResponse.json({ error: "Maximum 50 projects can be deleted at once" }, { status: 400 });
    }

    const auth = await requirePermission(supabase, "bulk:delete");
    if (isAuthError(auth)) return auth;

    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("org_id", auth.orgId)
      .in("id", ids);

    const validIds = projects?.map(p => p.id) || [];

    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid projects to delete" }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .in("id", validIds);

    if (deleteError) {
      return serverError(deleteError, "Bulk delete projects");
    }

    return NextResponse.json({
      success: true,
      deleted: validIds.length,
      message: `Deleted ${validIds.length} project${validIds.length !== 1 ? 's' : ''}`
    });
  } catch (e: any) {
    return serverError(e, "Bulk delete projects");
  }
}
