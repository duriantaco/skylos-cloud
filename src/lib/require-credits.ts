import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "./entitlements";

const BUY_URL = "https://skylos.dev/dashboard/billing";

export async function requireCredits(
  supabase: SupabaseClient,
  orgId: string,
  plan: Plan,
  featureKey: string,
  metadata?: Record<string, any>
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (plan === "enterprise") {
    return { ok: true };
  }

  const { data: featureCost } = await supabase
    .from("feature_credit_costs")
    .select("cost_credits, description")
    .eq("feature_key", featureKey)
    .eq("enabled", true)
    .maybeSingle();

  if (!featureCost) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Feature '${featureKey}' not found or disabled`, code: "FEATURE_NOT_FOUND" },
        { status: 404 }
      ),
    };
  }

  const costAmount = featureCost.cost_credits;

  const { data: deducted, error: creditErr } = await supabase.rpc("deduct_credits", {
    p_org_id: orgId,
    p_amount: costAmount,
    p_description: `Used feature: ${featureCost.description}`,
    p_metadata: {
      ...metadata,
      feature_key: featureKey,
      timestamp: new Date().toISOString(),
    },
  });

  if (creditErr) {
    console.error("Credit deduction failed:", creditErr);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Credit check failed. Please try again.", code: "CREDIT_ERROR" },
        { status: 500 }
      ),
    };
  }

  if (deducted === false) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Insufficient credits. This action requires ${costAmount} credits.`,
          code: "INSUFFICIENT_CREDITS",
          credits_required: costAmount,
          buy_url: BUY_URL,
        },
        { status: 402 }
      ),
    };
  }

  return { ok: true };
}


export function requirePlan(
  plan: Plan,
  minPlan: "pro" | "enterprise",
  featureName: string
): { ok: true } | { ok: false; response: NextResponse } {
  const hierarchy: Record<string, number> = { free: 0, pro: 1, enterprise: 2 };
  const current = hierarchy[plan] ?? 0;
  const required = hierarchy[minPlan] ?? 1;

  if (current >= required) {
    return { ok: true };
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: `${featureName} requires ${minPlan === "pro" ? "Pro" : "Enterprise"} plan. Buy any credit pack to unlock Pro.`,
        code: "PLAN_REQUIRED",
        required_plan: minPlan,
        buy_url: BUY_URL,
      },
      { status: 403 }
    ),
  };
}
