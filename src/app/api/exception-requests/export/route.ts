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
import type { ExceptionRequestStatus } from "@/lib/exception-governance";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as ExceptionRequestStatus | null;
  const issueGroupId = url.searchParams.get("issueGroupId") || undefined;
  const projectId = url.searchParams.get("projectId") || undefined;

  try {
    const rows = await loadExceptionEvidenceRows(supabase, auth.orgId, {
      status: status || undefined,
      issueGroupId,
      projectId,
    });

    const csv = generateExceptionEvidenceCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exception-evidence-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    return serverError(error, "Export exception evidence");
  }
}
