import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const scanId = params.id;

  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("scans")
    .select("quality_gate_passed, is_overridden, override_reason")
    .eq("id", scanId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: data.quality_gate_passed ? "PASSED" : "FAILED",
    is_overridden: data.is_overridden,
    override_reason: data.override_reason || null,
  });
}
