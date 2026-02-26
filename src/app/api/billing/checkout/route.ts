import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api-error";
import { CREDIT_PACKS, createCheckoutUrl, type PackId } from "@/lib/payments";
import { requirePermission, isAuthError } from "@/lib/permissions";

// GET /api/billing/checkout — list available credit packs
export async function GET() {
  const packs = Object.values(CREDIT_PACKS).map((p) => ({
    id: p.id,
    name: p.name,
    credits: p.credits,
    price: `$${(p.priceCents / 100).toFixed(0)}`,
    priceCents: p.priceCents,
    perCreditCost: p.perCreditCost,
  }));

  return NextResponse.json({ packs });
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
  if (!packId || !(packId in CREDIT_PACKS)) {
    return badRequest(
      `Invalid pack_id. Must be one of: ${Object.keys(CREDIT_PACKS).join(", ")}`
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

  const baseUrl = process.env.APP_BASE_URL || "https://skylos.dev";

  try {
    const checkoutUrl = await createCheckoutUrl({
      orgId: org.id,
      email: auth.user.email || "",
      packId: packId as PackId,
      successUrl: `${baseUrl}/dashboard/billing?success=true&pack=${packId}`,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    return serverError(err, "Billing checkout");
  }
}
