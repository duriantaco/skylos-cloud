import {
  lemonSqueezySetup,
  createCheckout,
} from "@lemonsqueezy/lemonsqueezy.js";
import { supabaseAdmin } from "@/utils/supabase/admin";
import crypto from "crypto";
import {
  getCheckoutBillingConfig,
  getLemonSqueezyApiKey,
  getLemonSqueezyWebhookSecret,
  type PackId,
} from "@/lib/billing-config";

let _initialized = false;

function ensureLemonSqueezy() {
  if (!_initialized) {
    lemonSqueezySetup({ apiKey: getLemonSqueezyApiKey() });
    _initialized = true;
  }
}

export interface CreditPack {
  id: PackId;
  name: string;
  credits: number;
  priceCents: number;
  variantId: string;
  perCreditCost: string;
  proDays: number;
}

const PRO_DURATION_MAP: Record<string, number> = {
  starter: 30,
  builder: 90,
  team: 180,
  scale: 365,
};

export function getProDurationDays(packId: string): number {
  return PRO_DURATION_MAP[packId] || 30;
}

export const CREDIT_PACKS: Record<PackId, CreditPack> = {
  starter: {
    id: "starter",
    name: "Starter",
    credits: 500,
    priceCents: 900,
    variantId: process.env.LS_VARIANT_STARTER || "",
    perCreditCost: "$0.018",
    proDays: 30,
  },
  builder: {
    id: "builder",
    name: "Builder",
    credits: 2_500,
    priceCents: 3_900,
    variantId: process.env.LS_VARIANT_BUILDER || "",
    perCreditCost: "$0.016",
    proDays: 90,
  },
  team: {
    id: "team",
    name: "Team",
    credits: 10_000,
    priceCents: 12_900,
    variantId: process.env.LS_VARIANT_TEAM || "",
    perCreditCost: "$0.013",
    proDays: 180,
  },
  scale: {
    id: "scale",
    name: "Scale",
    credits: 50_000,
    priceCents: 49_900,
    variantId: process.env.LS_VARIANT_SCALE || "",
    perCreditCost: "$0.010",
    proDays: 365,
  },
};

export function getPackById(packId: string): CreditPack | null {
  return CREDIT_PACKS[packId as PackId] ?? null;
}

export function getPackByVariantId(variantId: string): CreditPack | null {
  return Object.values(CREDIT_PACKS).find((p) => p.variantId === variantId) ?? null;
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
  const { storeId, variantId } = getCheckoutBillingConfig(opts.packId);

  const { data, error } = await createCheckout(storeId, variantId, {
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

  const url = data?.data?.attributes?.url;
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
  const { error } = await supabaseAdmin.rpc("add_credits", {
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

  const proDurationDays = getProDurationDays(opts.packId);

  const { data: currentOrg } = await supabaseAdmin
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", opts.orgId)
    .single();

  if (currentOrg?.plan !== "enterprise") {
    const now = new Date();
    const currentExpiry = currentOrg?.pro_expires_at ? new Date(currentOrg.pro_expires_at) : null;

    const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + proDurationDays * 24 * 60 * 60 * 1000);

    await supabaseAdmin
      .from("organizations")
      .update({ plan: "pro", pro_expires_at: newExpiry.toISOString() })
      .eq("id", opts.orgId);
  }

  return !error;
}

export async function handleRefund(orderId: string): Promise<void> {
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("credit_purchases")
    .update({ status: "refunded" })
    .eq("ls_order_id", orderId)
    .eq("status", "completed")
    .select("org_id, credits");

  if (updateErr || !updated || updated.length === 0) {
    console.warn("No matching completed purchase for refund (already refunded or not found):", orderId);
    return;
  }

  const purchase = updated[0];

  await supabaseAdmin.rpc("deduct_credits", {
    p_org_id: purchase.org_id,
    p_amount: purchase.credits,
    p_description: `Refund: ${purchase.credits} credits removed`,
    p_metadata: { ls_order_id: orderId },
  });
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = getLemonSqueezyWebhookSecret();

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(signature)
  );
}
