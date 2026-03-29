export type CheckoutPackShape = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  perCreditCost: string;
  proDays: number;
};

export type PublicCheckoutPack = {
  id: string;
  name: string;
  credits: number;
  price: string;
  priceCents: number;
  perCreditCost: string;
  proDays: number;
};

export function listPublicCheckoutPacks<T extends CheckoutPackShape>(
  packs: Record<string, T>
): PublicCheckoutPack[] {
  return Object.values(packs).map((pack) => ({
    id: pack.id,
    name: pack.name,
    credits: pack.credits,
    price: `$${(pack.priceCents / 100).toFixed(0)}`,
    priceCents: pack.priceCents,
    perCreditCost: pack.perCreditCost,
    proDays: pack.proDays,
  }));
}

export function isValidPackId<T extends string>(
  packId: string | undefined,
  packs: Record<T, unknown>
): packId is T {
  return typeof packId === "string" && packId in packs;
}

export function invalidPackIdMessage<T extends string>(
  packs: Record<T, unknown>
): string {
  return `Invalid pack_id. Must be one of: ${Object.keys(packs).join(", ")}`;
}

export function buildBillingSuccessUrl(baseUrl: string, packId: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/dashboard/billing?success=true&pack=${encodeURIComponent(packId)}`;
}
