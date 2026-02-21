import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  fulfillCreditPurchase,
  handleRefund,
  getPackByVariantId,
} from "@/lib/payments";

// POST /api/billing/webhook — Lemon Squeezy webhook handler
// Called by Lemon Squeezy, not by users
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-signature header" },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  try {
    const valid = verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      console.error("Webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch (err) {
    console.error("Webhook verification error:", err);
    return NextResponse.json({ error: "Signature check failed" }, { status: 400 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload?.meta?.event_name;
  const customData = payload?.meta?.custom_data || {};

  try {
    switch (eventName) {
      case "order_created": {
        const orgId = customData.org_id;
        const packId = customData.pack_id;
        const credits = parseInt(customData.credits || "0", 10);
        const orderId = String(payload?.data?.id || "");
        const amountCents = payload?.data?.attributes?.total || 0;

        if (!orgId || !packId || !credits) {
          console.error(
            "Missing custom data in order_created:",
            customData
          );
          break;
        }

        await fulfillCreditPurchase({
          orgId,
          packId,
          credits,
          amountCents,
          orderId,
        });

        console.log(
          `[billing] Fulfilled ${credits} credits for org ${orgId} (pack: ${packId}, order: ${orderId})`
        );
        break;
      }

      case "order_refunded": {
        const orderId = String(payload?.data?.id || "");
        if (orderId) {
          await handleRefund(orderId);
          console.log(`[billing] Processed refund for order ${orderId}`);
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }
  } catch (err) {
    console.error(`[billing] Error handling ${eventName}:`, err);
    // Return 200 to prevent Lemon Squeezy from retrying indefinitely
  }

  return NextResponse.json({ received: true });
}
