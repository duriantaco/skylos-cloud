import crypto from "crypto";

export type PackId = "starter" | "builder" | "team" | "scale";

export type BillingEnvKey =
  | "LEMONSQUEEZY_API_KEY"
  | "LEMONSQUEEZY_STORE_ID"
  | "LEMONSQUEEZY_WEBHOOK_SECRET"
  | "LS_VARIANT_STARTER"
  | "LS_VARIANT_BUILDER"
  | "LS_VARIANT_TEAM"
  | "LS_VARIANT_SCALE";

type BillingEnv = NodeJS.ProcessEnv | Record<string, string | undefined>;

export interface BillingVariantStatus {
  packId: PackId;
  envKey: BillingEnvKey;
  configured: boolean;
  variantId: string | null;
}

export interface BillingConfigStatus {
  ok: boolean;
  missing: BillingEnvKey[];
  apiKeyConfigured: boolean;
  apiKeyFingerprint: string | null;
  storeId: string | null;
  webhookSecretConfigured: boolean;
  webhookSecretFingerprint: string | null;
  variants: BillingVariantStatus[];
}

export const PACK_VARIANT_ENV_KEYS: Record<PackId, BillingEnvKey> = {
  starter: "LS_VARIANT_STARTER",
  builder: "LS_VARIANT_BUILDER",
  team: "LS_VARIANT_TEAM",
  scale: "LS_VARIANT_SCALE",
};

function readEnv(env: BillingEnv, key: BillingEnvKey): string | null {
  const value = env[key];
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function fingerprintSecret(value: string): string {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function requireBillingEnv(
  env: BillingEnv,
  keys: BillingEnvKey[],
  context: string
): void {
  const missing = keys.filter((key) => !readEnv(env, key));
  if (missing.length === 0) return;

  throw new Error(`${context} is not configured. Missing: ${missing.join(", ")}`);
}

export function getBillingConfigStatus(
  env: BillingEnv = process.env
): BillingConfigStatus {
  const apiKey = readEnv(env, "LEMONSQUEEZY_API_KEY");
  const storeId = readEnv(env, "LEMONSQUEEZY_STORE_ID");
  const webhookSecret = readEnv(env, "LEMONSQUEEZY_WEBHOOK_SECRET");
  const variants = (Object.entries(PACK_VARIANT_ENV_KEYS) as [
    PackId,
    BillingEnvKey,
  ][]).map(([packId, envKey]) => {
    const variantId = readEnv(env, envKey);
    return {
      packId,
      envKey,
      configured: Boolean(variantId),
      variantId,
    };
  });

  const missing: BillingEnvKey[] = [];

  if (!apiKey) missing.push("LEMONSQUEEZY_API_KEY");
  if (!storeId) missing.push("LEMONSQUEEZY_STORE_ID");
  if (!webhookSecret) missing.push("LEMONSQUEEZY_WEBHOOK_SECRET");
  for (const variant of variants) {
    if (!variant.configured) {
      missing.push(variant.envKey);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    apiKeyConfigured: Boolean(apiKey),
    apiKeyFingerprint: apiKey ? fingerprintSecret(apiKey) : null,
    storeId,
    webhookSecretConfigured: Boolean(webhookSecret),
    webhookSecretFingerprint: webhookSecret
      ? fingerprintSecret(webhookSecret)
      : null,
    variants,
  };
}

export function getLemonSqueezyApiKey(
  env: BillingEnv = process.env
): string {
  requireBillingEnv(env, ["LEMONSQUEEZY_API_KEY"], "Lemon Squeezy API access");
  return readEnv(env, "LEMONSQUEEZY_API_KEY")!;
}

export function getLemonSqueezyStoreId(
  env: BillingEnv = process.env
): string {
  requireBillingEnv(env, ["LEMONSQUEEZY_STORE_ID"], "Lemon Squeezy store access");
  return readEnv(env, "LEMONSQUEEZY_STORE_ID")!;
}

export function getLemonSqueezyWebhookSecret(
  env: BillingEnv = process.env
): string {
  requireBillingEnv(
    env,
    ["LEMONSQUEEZY_WEBHOOK_SECRET"],
    "Lemon Squeezy webhook verification"
  );
  return readEnv(env, "LEMONSQUEEZY_WEBHOOK_SECRET")!;
}

export function getPackVariantId(
  packId: PackId,
  env: BillingEnv = process.env
): string {
  const envKey = PACK_VARIANT_ENV_KEYS[packId];
  requireBillingEnv(env, [envKey], `Lemon Squeezy checkout for ${packId}`);
  return readEnv(env, envKey)!;
}

export function getCheckoutBillingConfig(
  packId: PackId,
  env: BillingEnv = process.env
): {
  apiKey: string;
  storeId: string;
  variantId: string;
} {
  const envKey = PACK_VARIANT_ENV_KEYS[packId];
  requireBillingEnv(
    env,
    ["LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_STORE_ID", envKey],
    `Billing checkout for ${packId}`
  );

  return {
    apiKey: readEnv(env, "LEMONSQUEEZY_API_KEY")!,
    storeId: readEnv(env, "LEMONSQUEEZY_STORE_ID")!,
    variantId: readEnv(env, envKey)!,
  };
}
