import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api-error";
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

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", auth.orgId)
    .single();

  if (!org) {
    return badRequest("No organization found for this user");
  }

  const baseUrl = process.env.APP_BASE_URL || "https://skylos.dev";

  try {
    const checkoutUrl = await createCheckoutUrl({
      orgId: org.id,
      email: auth.user.email || "",
      packId: packId as PackId,
      successUrl: buildBillingSuccessUrl(baseUrl, packId),
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    return serverError(err, "Billing checkout");
  }
}
