export type RefundResult =
  | "refunded"
  | "already_refunded"
  | "not_found"
  | "invalid_status"
  | "error";

export type RefundReconciliationStatus =
  | "unknown_refund"
  | "invalid_refund_status"
  | "refund_processing_error";

type ParsedOrderCreated = {
  orgId: string;
  packId: string;
  credits: number;
  orderId: string;
  amountCents: number;
};

type ParsedOrderRefunded = {
  orderId: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export function parseOrderCreatedPayload(
  payload: unknown
): ParsedOrderCreated | null {
  const root = asRecord(payload);
  const meta = asRecord(root?.meta);
  const data = asRecord(root?.data);
  const attributes = asRecord(data?.attributes);
  const customData = asRecord(meta?.custom_data);

  const orgId =
    typeof customData?.org_id === "string" ? customData.org_id : null;
  const packId =
    typeof customData?.pack_id === "string" ? customData.pack_id : null;
  const credits = Number.parseInt(String(customData?.credits || "0"), 10);
  const orderId = typeof data?.id === "string" ? data.id : "";
  const amountCents = Number.parseInt(String(attributes?.total || "0"), 10);

  if (!orderId || !orgId || !packId || !Number.isFinite(credits) || credits <= 0) {
    return null;
  }

  return {
    orgId,
    packId,
    credits,
    orderId,
    amountCents,
  };
}

export function parseOrderRefundedPayload(
  payload: unknown
): ParsedOrderRefunded | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const orderId = typeof data?.id === "string" ? data.id : "";

  if (!orderId) {
    return null;
  }

  return { orderId };
}

export function describeRefundResult(result: RefundResult, orderId: string): {
  ok: boolean;
  level: "info" | "warn" | "error";
  message: string;
} {
  switch (result) {
    case "refunded":
      return {
        ok: true,
        level: "info",
        message: `[billing] Processed refund for order ${orderId}`,
      };
    case "already_refunded":
      return {
        ok: true,
        level: "info",
        message: `[billing] Duplicate refund event for order ${orderId}`,
      };
    case "not_found":
      return {
        ok: true,
        level: "warn",
        message: `[billing] Queued reconciliation for unknown refund order ${orderId}`,
      };
    case "invalid_status":
      return {
        ok: false,
        level: "error",
        message: `[billing] Refund event for order ${orderId} is in an invalid state`,
      };
    default:
      return {
        ok: false,
        level: "error",
        message: `[billing] Failed to process refund for order ${orderId}`,
      };
  }
}

export function getRefundReconciliationStatus(
  result: RefundResult
): RefundReconciliationStatus | null {
  switch (result) {
    case "not_found":
      return "unknown_refund";
    case "invalid_status":
      return "invalid_refund_status";
    case "error":
      return "refund_processing_error";
    default:
      return null;
  }
}
