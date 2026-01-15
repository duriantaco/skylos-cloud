import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("scans")
    .select("quality_gate_passed, is_overridden, override_reason")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: data.quality_gate_passed ? "PASSED" : "FAILED",
    is_overridden: data.is_overridden
  });
}