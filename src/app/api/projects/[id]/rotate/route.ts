import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api-key";
import { serverError } from "@/lib/api-error";


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", id)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: member, error: memErr } = await supabase
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("org_id", project.org_id)
    .single();

  if (memErr || !member) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const role = String((member as any).role || "").toLowerCase();
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { plain: newKey, hash: newKeyHash } = generateApiKey();

  const { data: updated, error: updErr } = await supabase
    .from("projects")
    .update({ api_key_hash: newKeyHash })
    .eq("id", id)
    .select("id");

  if (updErr) {
    return serverError(updErr, "Rotate API key");
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, apiKey: newKey });
}
