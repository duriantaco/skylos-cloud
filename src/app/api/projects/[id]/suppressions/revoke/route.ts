import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      revoked_by: user.id,
    })
    .eq("project_id", id)
    .eq("rule_id", rule_id)
    .eq("file_path", file_path)
    .eq("line_number", line_number)
    .is("revoked_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}