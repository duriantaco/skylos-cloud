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

type SectionStatus = {
  ready: boolean;
  checked: boolean;
  message: string;
};

type PackStatus = {
  packId: string;
  ready: boolean;
  message: string;
};

type BillingStatusResponse = {
  configured: boolean;
  checkoutReady: boolean;
  config: SectionStatus;
  provider: SectionStatus;
  database: SectionStatus;
  packs: PackStatus[];
};

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
  const configReady =
    status.apiKeyConfigured &&
    Boolean(status.storeId) &&
    status.webhookSecretConfigured;
  const rawRemoteErrors: string[] = [];
  const rawDatabaseErrors: string[] = [];
  const accessibleVariantIds = new Set<string>();

  const response: BillingStatusResponse = {
    configured: status.ok,
    checkoutReady: false,
    config: {
      ready: configReady,
      checked: true,
      message: configReady
        ? "Checkout setup looks complete."
        : "Checkout setup is incomplete right now.",
    },
    provider: {
      ready: false,
      checked: false,
      message: configReady
        ? "Payment provider connectivity has not been checked yet."
        : "Payment provider checks are waiting for checkout setup to complete.",
    },
    database: {
      ready: false,
      checked: false,
      message: "Billing database checks have not completed yet.",
    },
    packs: status.variants.map((variant) => ({
      packId: variant.packId,
      ready: false,
      message: variant.configured
        ? "Availability has not been checked yet."
        : "This pack is not available right now.",
    })),
  };

  if (status.apiKeyConfigured && status.storeId) {
    try {
      lemonSqueezySetup({ apiKey: getLemonSqueezyApiKey() });

      const authResult = await getAuthenticatedUser();
      if (authResult.error) {
        rawRemoteErrors.push(formatLemonError(authResult.error));
      } else {
        const storeResult = await getStore(getLemonSqueezyStoreId());
        if (storeResult.error) {
          rawRemoteErrors.push(formatLemonError(storeResult.error));
        } else {
          response.provider.ready = true;
          response.provider.checked = true;
          response.provider.message = "Payment provider connectivity looks healthy.";

          const variantChecks = await Promise.all(
            status.variants.map(async (variant) => {
              if (!variant.configured || !variant.variantId) return;

              const variantResult = await getVariant(variant.variantId);
              if (variantResult.error) {
                rawRemoteErrors.push(
                  `${variant.packId}: ${formatLemonError(variantResult.error)}`
                );
                return;
              }

              accessibleVariantIds.add(variant.packId);
            })
          );

          void variantChecks;
        }
      }
    } catch (error) {
      rawRemoteErrors.push(formatLemonError(error));
    }
  }

  if (!response.provider.checked) {
    response.provider.checked = status.apiKeyConfigured && Boolean(status.storeId);
    if (response.provider.checked) {
      response.provider.message = "Payment provider connectivity needs attention right now.";
    }
  }

  try {
    const admin = getSupabaseAdmin();
    response.database.checked = true;

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
      rawDatabaseErrors.push(
        orgError?.message || "Organization billing row is not readable."
      );
    }

    if (costsError) {
      rawDatabaseErrors.push(costsError.message);
    } else {
      const foundKeys = new Set((costs || []).map((row) => row.feature_key));
      const missingFeatureKeys = requiredFeatureKeys.filter(
        (key) => !foundKeys.has(key)
      );
      if (missingFeatureKeys.length > 0) {
        rawDatabaseErrors.push(
          `Missing enabled billing costs: ${missingFeatureKeys.join(", ")}`
        );
      }
    }

    if (purchasesError) {
      rawDatabaseErrors.push(purchasesError.message);
    }
  } catch (error) {
    response.database.checked = true;
    rawDatabaseErrors.push(formatLemonError(error));
  }

  response.database.ready = rawDatabaseErrors.length === 0;
  response.database.message = response.database.ready
    ? "Billing records and credit pricing look healthy."
    : "Billing records need attention before checkout can go live.";

  response.packs = status.variants.map((variant) => {
    if (!configReady) {
      return {
        packId: variant.packId,
        ready: false,
        message: "Checkout setup is incomplete right now.",
      };
    }

    if (!response.provider.ready) {
      return {
        packId: variant.packId,
        ready: false,
        message: "Payment provider is temporarily unavailable right now.",
      };
    }

    if (!response.database.ready) {
      return {
        packId: variant.packId,
        ready: false,
        message: "Billing system checks need attention right now.",
      };
    }

    if (!variant.configured || !accessibleVariantIds.has(variant.packId)) {
      return {
        packId: variant.packId,
        ready: false,
        message: "This pack is not available right now.",
      };
    }

    return {
      packId: variant.packId,
      ready: true,
      message: "Ready for checkout.",
    };
  });

  response.checkoutReady =
    response.config.ready &&
    response.provider.ready &&
    response.database.ready &&
    response.packs.some((pack) => pack.ready);

  if (rawRemoteErrors.length > 0 || rawDatabaseErrors.length > 0 || status.missing.length > 0) {
    console.error("Billing status health check failed", {
      orgId: auth.orgId,
      missingConfig: status.missing,
      providerErrors: rawRemoteErrors,
      databaseErrors: rawDatabaseErrors,
    });
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
