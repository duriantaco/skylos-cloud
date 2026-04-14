import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { badRequest } from "@/lib/api-error";
import { getCheckoutBillingConfig } from "@/lib/billing-config";
import { CREDIT_PACKS, createCheckoutUrl, type PackId } from "@/lib/payments";
import { requirePermission, isAuthError } from "@/lib/permissions";
import {
  buildBillingSuccessUrl,
  invalidPackIdMessage,
  isValidPackId,
  listPublicCheckoutPacks,
} from "@/lib/billing-checkout";

// GET /api/billing/checkout — list available credit packs
export async function GET() {
  return NextResponse.json({ packs: listPublicCheckoutPacks(CREDIT_PACKS) });
}

// POST /api/billing/checkout — create a Lemon Squeezy checkout URL
// Body: { pack_id: "starter" | "builder" | "team" | "scale" }
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "manage:billing");
  if (isAuthError(auth)) return auth;

  let body: { pack_id?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const packId = body.pack_id;
  if (!isValidPackId(packId, CREDIT_PACKS)) {
    return badRequest(invalidPackIdMessage(CREDIT_PACKS));
  }

  try {
    getCheckoutBillingConfig(packId as PackId);
  } catch (error) {
    console.error("Billing checkout config check failed", {
      orgId: auth.orgId,
      packId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Checkout is not available for this pack right now.",
        code: "BILLING_NOT_CONFIGURED",
        pack_id: packId,
      },
      { status: 503 }
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", auth.orgId)
    .single();

  if (!org) {
    return badRequest("No organization found for this user");
  }

  if (!auth.user.email?.trim()) {
    return badRequest("Your account does not have a billing email yet. Add an email to your account before checkout.");
  }

  const baseUrl = process.env.APP_BASE_URL || "https://skylos.dev";

  try {
    const checkoutUrl = await createCheckoutUrl({
      orgId: org.id,
      email: auth.user.email,
      packId: packId as PackId,
      successUrl: buildBillingSuccessUrl(baseUrl, packId),
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    console.error("Billing checkout session creation failed", {
      orgId: org.id,
      packId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error: "Checkout could not be started right now. Please try again later.",
        code: "CHECKOUT_FAILED",
        pack_id: packId,
      },
      { status: 502 }
    );
  }
}
