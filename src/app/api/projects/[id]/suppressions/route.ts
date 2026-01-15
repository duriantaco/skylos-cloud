import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const includeRevoked = url.searchParams.get("includeRevoked") === "true";

  let query = supabase
    .from("finding_suppressions")
    .select("project_id, rule_id, file_path, line_number, reason, created_at, created_by, expires_at, revoked_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (!includeRevoked) {
    query = query.is("revoked_at", null);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data || [] });
}