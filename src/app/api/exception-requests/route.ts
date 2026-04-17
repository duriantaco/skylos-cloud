import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";
import { loadExceptionRequests } from "@/lib/exception-requests";
import type { ExceptionRequestStatus } from "@/lib/exception-governance";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const issueGroupId = url.searchParams.get("issueGroupId") || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 100);
  const status = statusParam as ExceptionRequestStatus | null;

  try {
    const requests = await loadExceptionRequests(supabase, auth.orgId, {
      status: status || undefined,
      issueGroupId,
      limit,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    return serverError(error, "Load exception requests");
  }
}
