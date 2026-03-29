import assert from "node:assert/strict";
import {
  fingerprintSecret,
  getBillingConfigStatus,
  getCheckoutBillingConfig,
  getLemonSqueezyWebhookSecret,
  getPackVariantId,
  type PackId,
} from "../src/lib/billing-config";

type BillingEnv = Record<string, string | undefined>;

const PACK_VARIANTS: Record<PackId, string> = {
  starter: "1001",
  builder: "1002",
  team: "1003",
  scale: "1004",
};

function buildEnv(overrides: BillingEnv = {}): BillingEnv {
  return {
    LEMONSQUEEZY_API_KEY: "ls_test_live_api_key",
    LEMONSQUEEZY_STORE_ID: "424242",
    LEMONSQUEEZY_WEBHOOK_SECRET: "whsec_test_secret",
    LS_VARIANT_STARTER: PACK_VARIANTS.starter,
    LS_VARIANT_BUILDER: PACK_VARIANTS.builder,
    LS_VARIANT_TEAM: PACK_VARIANTS.team,
    LS_VARIANT_SCALE: PACK_VARIANTS.scale,
    ...overrides,
  };
}

function expectThrows(fn: () => unknown, expected: string): void {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, new RegExp(expected));
    return true;
  });
}

function run(): void {
  const env = buildEnv();
  const status = getBillingConfigStatus(env);

  assert.equal(status.ok, true);
  assert.deepEqual(status.missing, []);
  assert.equal(status.storeId, "424242");
  assert.equal(status.apiKeyConfigured, true);
  assert.equal(
    status.apiKeyFingerprint,
    fingerprintSecret("ls_test_live_api_key")
  );
  assert.equal(
    status.webhookSecretFingerprint,
    fingerprintSecret("whsec_test_secret")
  );
  assert.deepEqual(
    status.variants.map((variant) => [variant.packId, variant.variantId]),
    [
      ["starter", "1001"],
      ["builder", "1002"],
      ["team", "1003"],
      ["scale", "1004"],
    ]
  );

  const checkout = getCheckoutBillingConfig("team", env);
  assert.deepEqual(checkout, {
    apiKey: "ls_test_live_api_key",
    storeId: "424242",
    variantId: "1003",
  });
  assert.equal(getPackVariantId("scale", env), "1004");
  assert.equal(getLemonSqueezyWebhookSecret(env), "whsec_test_secret");

  const missingApiKey = buildEnv({ LEMONSQUEEZY_API_KEY: "   " });
  const missingVariant = buildEnv({ LS_VARIANT_TEAM: "" });
  const missingWebhook = buildEnv({ LEMONSQUEEZY_WEBHOOK_SECRET: undefined });

  expectThrows(
    () => getCheckoutBillingConfig("starter", missingApiKey),
    "LEMONSQUEEZY_API_KEY"
  );
  expectThrows(
    () => getCheckoutBillingConfig("team", missingVariant),
    "LS_VARIANT_TEAM"
  );
  expectThrows(
    () => getLemonSqueezyWebhookSecret(missingWebhook),
    "LEMONSQUEEZY_WEBHOOK_SECRET"
  );

  const partialStatus = getBillingConfigStatus(
    buildEnv({
      LEMONSQUEEZY_API_KEY: undefined,
      LS_VARIANT_SCALE: "   ",
    })
  );
  assert.equal(partialStatus.ok, false);
  assert.deepEqual(partialStatus.missing, [
    "LEMONSQUEEZY_API_KEY",
    "LS_VARIANT_SCALE",
  ]);

  console.log("verify-billing-config: ok");
}

run();
