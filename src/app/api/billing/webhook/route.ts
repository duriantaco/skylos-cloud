import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  fulfillCreditPurchase,
  handleRefund,
  recordBillingReconciliationEvent,
} from "@/lib/payments";
import {
  describeRefundResult,
  getRefundReconciliationStatus,
  parseOrderCreatedPayload,
  parseOrderRefundedPayload,
} from "@/lib/billing-webhook-core";

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

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const meta = (payload.meta as Record<string, unknown> | undefined) || {};
  const customData = (meta.custom_data as Record<string, unknown> | undefined) || {};
  const eventName = typeof meta.event_name === "string" ? meta.event_name : null;

  try {
    switch (eventName) {
      case "order_created": {
        const parsedOrder = parseOrderCreatedPayload(payload);
        if (!parsedOrder) {
          console.error(
            "Invalid order_created payload:",
            { customData }
          );
          return NextResponse.json(
            { error: "Invalid order_created payload" },
            { status: 400 }
          );
        }

        const fulfilled = await fulfillCreditPurchase({
          orgId: parsedOrder.orgId,
          packId: parsedOrder.packId,
          credits: parsedOrder.credits,
          amountCents: parsedOrder.amountCents,
          orderId: parsedOrder.orderId,
        });

        if (!fulfilled) {
          return NextResponse.json(
            { error: "Failed to fulfill purchase" },
            { status: 500 }
          );
        }

        console.log(
          `[billing] Fulfilled ${parsedOrder.credits} credits for org ${parsedOrder.orgId} (pack: ${parsedOrder.packId}, order: ${parsedOrder.orderId})`
        );
        break;
      }

      case "order_refunded": {
        const refundedOrder = parseOrderRefundedPayload(payload);
        if (!refundedOrder) {
          return NextResponse.json(
            { error: "Invalid order_refunded payload" },
            { status: 400 }
          );
        }

        const refundResult = await handleRefund(refundedOrder.orderId);
        const reconciliationStatus = getRefundReconciliationStatus(refundResult);

        if (reconciliationStatus) {
          await recordBillingReconciliationEvent({
            eventName,
            status: reconciliationStatus,
            orderId: refundedOrder.orderId,
            details: {
              refund_result: refundResult,
            },
            payload,
          });
        }

        const disposition = describeRefundResult(
          refundResult,
          refundedOrder.orderId
        );

        if (!disposition.ok) {
          return NextResponse.json(
            { error: "Failed to process refund" },
            { status: 500 }
          );
        }

        if (disposition.level === "warn") {
          console.warn(disposition.message);
        } else {
          console.log(disposition.message);
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }
  } catch (err) {
    console.error(`[billing] Error handling ${eventName}:`, err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
