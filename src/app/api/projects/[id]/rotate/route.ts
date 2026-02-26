import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api-key";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", id)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const auth = await requirePermission(supabase, "rotate:keys", project.org_id);
  if (isAuthError(auth)) return auth;

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
