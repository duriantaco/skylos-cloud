import test from "node:test";
import assert from "node:assert/strict";
import {
  describeRefundResult,
  getRefundReconciliationStatus,
  parseOrderCreatedPayload,
  parseOrderRefundedPayload,
} from "../../src/lib/billing-webhook-core";

test("parseOrderCreatedPayload accepts valid Lemon Squeezy payloads", () => {
  const parsed = parseOrderCreatedPayload({
    meta: {
      custom_data: {
        org_id: "org-123",
        pack_id: "team",
        credits: "10000",
      },
    },
    data: {
      id: "order-1",
      attributes: {
        total: "12900",
      },
    },
  });

  assert.deepEqual(parsed, {
    orgId: "org-123",
    packId: "team",
    credits: 10000,
    orderId: "order-1",
    amountCents: 12900,
  });
});

test("parseOrderCreatedPayload rejects malformed purchases", () => {
  assert.equal(
    parseOrderCreatedPayload({
      meta: { custom_data: { org_id: "org-123", pack_id: "team", credits: "0" } },
      data: { id: "order-1", attributes: { total: "12900" } },
    }),
    null
  );

  assert.equal(
    parseOrderCreatedPayload({
      meta: { custom_data: { org_id: "org-123", credits: "100" } },
      data: { id: "order-1", attributes: { total: "12900" } },
    }),
    null
  );
});

test("parseOrderRefundedPayload accepts valid refund payloads", () => {
  assert.deepEqual(
    parseOrderRefundedPayload({ data: { id: "order-2" } }),
    { orderId: "order-2" }
  );
});

test("describeRefundResult classifies anomalous refunds without retrying", () => {
  assert.deepEqual(describeRefundResult("refunded", "order-1"), {
    ok: true,
    level: "info",
    message: "[billing] Processed refund for order order-1",
  });

  assert.deepEqual(describeRefundResult("not_found", "order-2"), {
    ok: true,
    level: "warn",
    message: "[billing] Queued reconciliation for unknown refund order order-2",
  });

  assert.deepEqual(describeRefundResult("invalid_status", "order-3"), {
    ok: false,
    level: "error",
    message: "[billing] Refund event for order order-3 is in an invalid state",
  });
});

test("getRefundReconciliationStatus flags refund anomalies for audit", () => {
  assert.equal(getRefundReconciliationStatus("refunded"), null);
  assert.equal(getRefundReconciliationStatus("already_refunded"), null);
  assert.equal(getRefundReconciliationStatus("not_found"), "unknown_refund");
  assert.equal(getRefundReconciliationStatus("invalid_status"), "invalid_refund_status");
  assert.equal(getRefundReconciliationStatus("error"), "refund_processing_error");
});
