import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : "False positive";
  const expires_at = typeof body.expires_at === "string" ? body.expires_at : null;

  const { data: group, error: gErr } = await supabase
    .from("issue_groups")
    .select("id, project_id")
    .eq("id", id)
    .single();

  if (gErr || !group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (!group.project_id) return NextResponse.json({ error: "Group missing project_id" }, { status: 400 });

  const { data: findings, error: fErr } = await supabase
    .from("findings")
    .select("id, rule_id, file_path, line_number")
    .eq("group_id", id)
    .limit(5000);

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
  if (!findings?.length) return NextResponse.json({ error: "No findings in group" }, { status: 404 });

  // upsert suppressions signatures (assumes you have suppressions table + unique key)
  const suppressionRows = findings.map((f: any) => ({
    project_id: group.project_id,
    rule_id: f.rule_id,
    file_path: f.file_path,
    line_number: Number(f.line_number || 0),
    reason,
    created_by: user.id,
    expires_at,
  }));

  const { error: sErr } = await supabase
    .from("suppressions")
    .upsert(suppressionRows, { onConflict: "project_id,rule_id,line_number,file_path" });

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const { error: markErr } = await supabase
    .from("findings")
    .update({ is_suppressed: true })
    .eq("group_id", id);

  if (markErr) return NextResponse.json({ error: markErr.message }, { status: 500 });

  const { error: groupErr } = await supabase
    .from("issue_groups")
    .update({ status: "suppressed" })
    .eq("id", id);

  if (groupErr) return NextResponse.json({ error: groupErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
