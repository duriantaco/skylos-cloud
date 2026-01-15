import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No project IDs provided" }, { status: 400 });
    }

    if (ids.length > 50) {
      return NextResponse.json({ error: "Maximum 50 projects can be deleted at once" }, { status: 400 });
    }

    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Not a member of any organization" }, { status: 403 });
    }

    if (member.role !== "admin") {
      return NextResponse.json({ error: "Only admins can bulk delete projects" }, { status: 403 });
    }

    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("org_id", member.org_id)
      .in("id", ids);

    const validIds = projects?.map(p => p.id) || [];
    
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid projects to delete" }, { status: 400 });
    }

    const { error: deleteError, count } = await supabase
      .from("projects")
      .delete()
      .in("id", validIds);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      deleted: validIds.length,
      message: `Deleted ${validIds.length} project${validIds.length !== 1 ? 's' : ''}`
    });
  } catch (e: any) {
    console.error("Bulk delete error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}