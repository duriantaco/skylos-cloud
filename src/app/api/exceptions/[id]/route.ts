import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";
import { loadExceptionRequestDetail } from "@/lib/exception-requests";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requirePermission(supabase, "view:findings");
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
  const planCheck = requirePlan(effectivePlan, "pro", "Exception Governance");
  if (!planCheck.ok) return planCheck.response;

  try {
    const detail = await loadExceptionRequestDetail(supabase, auth.orgId, id);
    if (!detail.request) {
      return NextResponse.json({ error: "Exception request not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    return serverError(error, "Load exception request detail");
  }
}
