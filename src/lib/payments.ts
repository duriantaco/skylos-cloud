import {
  lemonSqueezySetup,
  createCheckout,
  getCustomer,
  type Checkout,
} from "@lemonsqueezy/lemonsqueezy.js";
import { supabaseAdmin } from "@/utils/supabase/admin";
import crypto from "crypto";

let _initialized = false;

function ensureLemonSqueezy() {
  if (!_initialized) {
    const key = process.env.LEMONSQUEEZY_API_KEY;
    if (!key) throw new Error("LEMONSQUEEZY_API_KEY is not set");
    lemonSqueezySetup({ apiKey: key });
    _initialized = true;
  }
}

export type PackId = "starter" | "builder" | "team" | "scale";

export interface CreditPack {
  id: PackId;
  name: string;
  credits: number;
  priceCents: number;
  variantId: string;
  perCreditCost: string;
}

export const CREDIT_PACKS: Record<PackId, CreditPack> = {
  starter: {
    id: "starter",
    name: "Starter",
    credits: 500,
    priceCents: 900,
    variantId: process.env.LS_VARIANT_STARTER || "",
    perCreditCost: "$0.018",
  },
  builder: {
    id: "builder",
    name: "Builder",
    credits: 2_500,
    priceCents: 3_900,
    variantId: process.env.LS_VARIANT_BUILDER || "",
    perCreditCost: "$0.016",
  },
  team: {
    id: "team",
    name: "Team",
    credits: 10_000,
    priceCents: 12_900,
    variantId: process.env.LS_VARIANT_TEAM || "",
    perCreditCost: "$0.013",
  },
  scale: {
    id: "scale",
    name: "Scale",
    credits: 50_000,
    priceCents: 49_900,
    variantId: process.env.LS_VARIANT_SCALE || "",
    perCreditCost: "$0.010",
  },
};

export function getPackById(packId: string): CreditPack | null {
  return CREDIT_PACKS[packId as PackId] ?? null;
}

export function getPackByVariantId(variantId: string): CreditPack | null {
  return (
    Object.values(CREDIT_PACKS).find((p) => p.variantId === variantId) ?? null
  );
}

export async function createCheckoutUrl(opts: {
  orgId: string;
  email: string;
  packId: PackId;
  successUrl: string;
}): Promise<string> {
  ensureLemonSqueezy();

  const pack = CREDIT_PACKS[opts.packId];
  if (!pack) throw new Error(`Unknown pack: ${opts.packId}`);
  if (!pack.variantId) throw new Error(`No variant ID configured for pack: ${opts.packId}`);

  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!storeId) throw new Error("LEMONSQUEEZY_STORE_ID is not set");

  const { data, error } = await createCheckout(storeId, pack.variantId, {
    checkoutData: {
      email: opts.email,
      custom: {
        org_id: opts.orgId,
        pack_id: opts.packId,
        credits: String(pack.credits),
      },
    },
    productOptions: {
      redirectUrl: opts.successUrl,
    },
  });

  if (error) throw new Error(`Lemon Squeezy checkout failed: ${error.message}`);

  const url = (data as any)?.data?.attributes?.url;
  if (!url) throw new Error("No checkout URL returned from Lemon Squeezy");

  return url;
}

export async function fulfillCreditPurchase(opts: {
  orgId: string;
  packId: string;
  credits: number;
  amountCents: number;
  orderId: string;
  userId?: string;
}): Promise<boolean> {
  const { data: success, error } = await supabaseAdmin.rpc("add_credits", {
    p_org_id: opts.orgId,
    p_amount: opts.credits,
    p_transaction_type: "purchase",
    p_description: `Purchased ${opts.credits} credits (${opts.packId} pack)`,
    p_metadata: {
      pack_id: opts.packId,
      ls_order_id: opts.orderId,
    },
    p_created_by: opts.userId || null,
  });

  if (error) {
    console.error("Failed to add credits:", error);
    return false;
  }

  await supabaseAdmin.from("credit_purchases").insert({
    org_id: opts.orgId,
    credits: opts.credits,
    amount_cents: opts.amountCents,
    pack_name: opts.packId,
    ls_order_id: opts.orderId,
    status: "completed",
  });

  return !!success;
}

export async function handleRefund(orderId: string): Promise<void> {
  const { data: purchase } = await supabaseAdmin
    .from("credit_purchases")
    .select("*")
    .eq("ls_order_id", orderId)
    .eq("status", "completed")
    .single();

  if (!purchase) {
    console.warn("No matching purchase for refund:", orderId);
    return;
  }

  await supabaseAdmin.rpc("deduct_credits", {
    p_org_id: purchase.org_id,
    p_amount: purchase.credits,
    p_description: `Refund: ${purchase.credits} credits removed`,
    p_metadata: { ls_order_id: orderId },
  });

  await supabaseAdmin
    .from("credit_purchases")
    .update({ status: "refunded" })
    .eq("id", purchase.id);
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) throw new Error("LEMONSQUEEZY_WEBHOOK_SECRET is not set");

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(signature)
  );
}
