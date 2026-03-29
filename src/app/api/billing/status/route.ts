import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isAuthError, requirePermission } from "@/lib/permissions";
import {
  getBillingConfigStatus,
  getLemonSqueezyApiKey,
  getLemonSqueezyStoreId,
} from "@/lib/billing-config";
import {
  getAuthenticatedUser,
  getStore,
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
  } catch (error) {
    response.remote.errors.push(formatLemonError(error));
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
