import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

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

    const { data: project } = await supabase
      .from("projects")
      .select("id, org_id")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", project.org_id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}