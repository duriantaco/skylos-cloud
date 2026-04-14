import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isAuthError, requirePermission } from "@/lib/permissions";
import {
  getBillingConfigStatus,
  getLemonSqueezyApiKey,
  getLemonSqueezyStoreId,
} from "@/lib/billing-config";
import { FEATURE_KEYS } from "@/lib/credits";
import { getSupabaseAdmin } from "@/utils/supabase/admin";
import {
  getAuthenticatedUser,
  getStore,
  getVariant,
  lemonSqueezySetup,
} from "@lemonsqueezy/lemonsqueezy.js";

function formatLemonError(error: unknown): string {
  if (error instanceof Error) {
    return error.cause
      ? `${error.message}: ${String(error.cause)}`
      : error.message;
  }

  return String(error);
}

// GET /api/billing/status — billing configuration and Lemon Squeezy connectivity
export async function GET() {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "manage:billing");
  if (isAuthError(auth)) return auth;

  const status = getBillingConfigStatus();
  const response = {
    configured: status.ok,
    checkoutReady: false,
    missing: status.missing,
    config: {
      apiKeyConfigured: status.apiKeyConfigured,
      apiKeyFingerprint: status.apiKeyFingerprint,
      storeId: status.storeId,
      webhookSecretConfigured: status.webhookSecretConfigured,
      webhookSecretFingerprint: status.webhookSecretFingerprint,
      variants: status.variants,
    },
    remote: {
      apiKeyValid: false,
      storeAccessible: false,
      storeName: null as string | null,
      storeUrl: null as string | null,
      errors: [] as string[],
      variants: status.variants.map((variant) => ({
        packId: variant.packId,
        envKey: variant.envKey,
        configured: variant.configured,
        variantId: variant.variantId,
        accessible: false,
        variantName: null as string | null,
        errors: [] as string[],
      })),
    },
    database: {
      ready: false,
      adminConfigured: false,
      organizationReadable: false,
      featureCostsReady: false,
      featureCostsCount: 0,
      purchasesReadable: false,
      missingFeatureKeys: [] as string[],
      errors: [] as string[],
    },
  };

  if (!status.apiKeyConfigured || !status.storeId) {
    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    lemonSqueezySetup({ apiKey: getLemonSqueezyApiKey() });

    const authResult = await getAuthenticatedUser();
    if (authResult.error) {
      response.remote.errors.push(formatLemonError(authResult.error));
      return NextResponse.json(response, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    response.remote.apiKeyValid = true;

    const storeResult = await getStore(getLemonSqueezyStoreId());
    if (storeResult.error) {
      response.remote.errors.push(formatLemonError(storeResult.error));
      return NextResponse.json(response, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    response.remote.storeAccessible = true;
    response.remote.storeName = storeResult.data?.data?.attributes?.name ?? null;
    response.remote.storeUrl = storeResult.data?.data?.attributes?.url ?? null;

    response.remote.variants = await Promise.all(
      response.remote.variants.map(async (variant) => {
        if (!variant.configured || !variant.variantId) {
          variant.errors.push(`Missing ${variant.envKey}`);
          return variant;
        }

        const variantResult = await getVariant(variant.variantId);
        if (variantResult.error) {
          variant.errors.push(formatLemonError(variantResult.error));
          return variant;
        }

        variant.accessible = true;
        variant.variantName = variantResult.data?.data?.attributes?.name ?? null;
        return variant;
      })
    );
  } catch (error) {
    response.remote.errors.push(formatLemonError(error));
  }

  try {
    const admin = getSupabaseAdmin();
    response.database.adminConfigured = true;

    const requiredFeatureKeys = [
      FEATURE_KEYS.SCAN_UPLOAD,
      FEATURE_KEYS.SCAN_DIFF,
      FEATURE_KEYS.PR_REVIEW,
      FEATURE_KEYS.AI_TRIAGE,
      FEATURE_KEYS.MCP_REMEDIATE,
      FEATURE_KEYS.COMPLIANCE_REPORT,
    ];

    const [
      { data: org, error: orgError },
      { data: costs, error: costsError },
      { error: purchasesError },
    ] = await Promise.all([
      admin
        .from("organizations")
        .select("id")
        .eq("id", auth.orgId)
        .single(),
      admin
        .from("feature_credit_costs")
        .select("feature_key")
        .in("feature_key", requiredFeatureKeys)
        .eq("enabled", true),
      admin
        .from("credit_purchases")
        .select("id")
        .eq("org_id", auth.orgId)
        .limit(1),
    ]);

    if (orgError || !org) {
      response.database.errors.push(orgError?.message || "Organization billing row is not readable.");
    } else {
      response.database.organizationReadable = true;
    }

    if (costsError) {
      response.database.errors.push(costsError.message);
    } else {
      const foundKeys = new Set((costs || []).map((row) => row.feature_key));
      response.database.featureCostsCount = foundKeys.size;
      response.database.missingFeatureKeys = requiredFeatureKeys.filter((key) => !foundKeys.has(key));
      response.database.featureCostsReady = response.database.missingFeatureKeys.length === 0;
      if (!response.database.featureCostsReady) {
        response.database.errors.push(
          `Missing enabled billing costs: ${response.database.missingFeatureKeys.join(", ")}`
        );
      }
    }

    if (purchasesError) {
      response.database.errors.push(purchasesError.message);
    } else {
      response.database.purchasesReadable = true;
    }
  } catch (error) {
    response.database.errors.push(formatLemonError(error));
  }

  response.database.ready =
    response.database.adminConfigured &&
    response.database.organizationReadable &&
    response.database.featureCostsReady &&
    response.database.purchasesReadable;

  response.checkoutReady =
    response.remote.apiKeyValid &&
    response.remote.storeAccessible &&
    response.database.ready &&
    response.remote.variants.some((variant) => variant.accessible);

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
