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
import type { RefundReconciliationStatus } from "@/lib/billing-webhook-core";

export type { PackId } from "@/lib/billing-config";

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
}

export const CREDIT_PACKS: Record<PackId, CreditPack> = {
  starter: {
    id: "starter",
    name: "Starter",
    credits: 50,
    priceCents: 900,
    variantId: process.env.LS_VARIANT_STARTER || "",
    perCreditCost: "$0.180",
  },
  builder: {
    id: "builder",
    name: "Builder",
    credits: 250,
    priceCents: 3_900,
    variantId: process.env.LS_VARIANT_BUILDER || "",
    perCreditCost: "$0.156",
  },
  team: {
    id: "team",
    name: "Team",
    credits: 1_000,
    priceCents: 12_900,
    variantId: process.env.LS_VARIANT_TEAM || "",
    perCreditCost: "$0.129",
  },
  scale: {
    id: "scale",
    name: "Scale",
    credits: 5_000,
    priceCents: 49_900,
    variantId: process.env.LS_VARIANT_SCALE || "",
    perCreditCost: "$0.100",
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
  const { data, error } = await supabaseAdmin.rpc("fulfill_credit_purchase", {
    p_org_id: opts.orgId,
    p_pack_id: opts.packId,
    p_credits: opts.credits,
    p_amount_cents: opts.amountCents,
    p_order_id: opts.orderId,
    p_user_id: opts.userId || null,
  });

  if (error) {
    console.error("Failed to fulfill credit purchase:", error);
    return false;
  }

  return data === true;
}

export type RefundResult =
  | "refunded"
  | "already_refunded"
  | "not_found"
  | "invalid_status"
  | "error";

export async function handleRefund(orderId: string): Promise<RefundResult> {
  const { data, error } = await supabaseAdmin.rpc("refund_credit_purchase", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("Failed to process refund:", error);
    return "error";
  }

  if (
    data === "refunded" ||
    data === "already_refunded" ||
    data === "not_found" ||
    data === "invalid_status"
  ) {
    return data;
  }

  return "error";
}

export async function recordBillingReconciliationEvent(opts: {
  eventName: string;
  status: RefundReconciliationStatus;
  orderId?: string | null;
  details?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from("billing_reconciliation_events")
    .insert({
      event_name: opts.eventName,
      status: opts.status,
      order_id: opts.orderId ?? null,
      details: opts.details ?? {},
      payload: opts.payload ?? {},
    });

  if (error) {
    console.error("Failed to record billing reconciliation event:", error);
  }
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
