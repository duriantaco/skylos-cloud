import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";
import {
  generateExceptionEvidenceCsv,
  loadExceptionEvidenceRows,
} from "@/lib/exception-evidence";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requirePermission(supabase, "view:compliance");
  if (isAuthError(auth)) return auth;

  const { data: org } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", auth.orgId)
    .single();

  const effectivePlan = getEffectivePlan({
    plan: org?.plan || "free",
    pro_expires_at: org?.pro_expires_at,
  });
  const planCheck = requirePlan(effectivePlan, "pro", "Exception Evidence Export");
  if (!planCheck.ok) return planCheck.response;

  try {
    const rows = await loadExceptionEvidenceRows(supabase, auth.orgId, {
      requestId: id,
      limit: 1,
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "Exception request not found" }, { status: 404 });
    }

    const csv = generateExceptionEvidenceCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exception-${id}.csv"`,
      },
    });
  } catch (error) {
    return serverError(error, "Export exception evidence detail");
  }
}
