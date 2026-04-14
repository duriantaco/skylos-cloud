"use client";

import NoticeModal from "@/components/NoticeModal";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CreditCard,
  Zap,
  Package,
  CheckCircle,
  Loader2,
  RefreshCw,
  Shield,
  Check,
} from "lucide-react";

type CreditPack = {
  id: string;
  name: string;
  credits: number;
  price: string;
  priceCents: number;
  perCreditCost: string;
};

type Transaction = {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string;
  created_at: string;
  metadata?: unknown;
};

type BillingVariantStatus = {
  packId: string;
  envKey: string;
  configured: boolean;
  variantId: string | null;
  accessible: boolean;
  variantName: string | null;
  errors: string[];
};

type BillingStatusResponse = {
  configured: boolean;
  checkoutReady: boolean;
  missing: string[];
  remote: {
    apiKeyValid: boolean;
    storeAccessible: boolean;
    storeName: string | null;
    storeUrl: string | null;
    errors: string[];
    variants: BillingVariantStatus[];
  };
  database: {
    ready: boolean;
    adminConfigured: boolean;
    organizationReadable: boolean;
    featureCostsReady: boolean;
    featureCostsCount: number;
    purchasesReadable: boolean;
    missingFeatureKeys: string[];
    errors: string[];
  };
};

const WORKSPACE_FEATURES = [
  "Advanced gate modes (category, severity, both)",
  "Full trend analytics and history",
  "Team collaboration (comments, assignments)",
  "Slack and Discord integrations",
  "Suppression governance (unlimited, audit)",
  "PR auto-fix with LLM (3 cr)",
  "Compliance reports (500 cr)",
  "Up to 50 custom rules",
  "90-day history retention",
  "Findings export (CSV/JSON)",
];

const CREDIT_COSTS = [
  { action: "Scan upload", credits: 1, why: "Cloud storage & processing" },
  { action: "Scan comparison", credits: 2, why: "Diff computation" },
  { action: "PR auto-fix", credits: 3, why: "LLM generates code fix" },
  { action: "AI issue triage", credits: 5, why: "LLM analyzes severity & impact" },
  { action: "MCP AI remediation", credits: 10, why: "LLM multi-step fix" },
  { action: "Compliance report", credits: 500, why: "LLM maps findings to frameworks" },
];

const PACK_PRESENTATION: Record<string, { eyebrow: string; description: string; bestFor: string }> = {
  starter: {
    eyebrow: "Quick start",
    description: "Unlock workspace access and cover first shared uploads.",
    bestFor: "Best for smoke tests and first cloud runs.",
  },
  builder: {
    eyebrow: "Solo flow",
    description: "Enough credits for regular uploads, compare, and occasional AI help.",
    bestFor: "Best for one repo with steady weekly usage.",
  },
  team: {
    eyebrow: "Daily workflow",
    description: "Balanced pack for shared cloud scans, compare, and AI actions.",
    bestFor: "Best for teams using Skylos every week.",
  },
  scale: {
    eyebrow: "Heavy automation",
    description: "For frequent uploads, automated review loops, and compliance work.",
    bestFor: "Best for multi-repo automation and high-volume usage.",
  },
};

function buildPackExamples(credits: number) {
  return [
    `≈ ${credits.toLocaleString()} uploads`,
    `≈ ${Math.max(1, Math.floor(credits / 2)).toLocaleString()} compares`,
    `≈ ${Math.max(1, Math.floor(credits / 5)).toLocaleString()} triages`,
  ];
}

export default function BillingPage() {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [plan, setPlan] = useState<string>("free");
  const [proExpiresAt, setProExpiresAt] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [billingStatusError, setBillingStatusError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successPack, setSuccessPack] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<{ packId: string | null; message: string } | null>(null);
  const [refreshingDiagnostics, setRefreshingDiagnostics] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  async function loadBillingStatus() {
    try {
      const statusRes = await fetch("/api/billing/status", { cache: "no-store" });
      if (statusRes.ok) {
        const data = await statusRes.json();
        setBillingStatus(data);
        setBillingStatusError(null);
        return;
      }

      if (statusRes.status === 401 || statusRes.status === 403) {
        setBillingStatus(null);
        setBillingStatusError(null);
        return;
      }

      const data = await statusRes.json().catch(() => null);
      setBillingStatus(null);
      setBillingStatusError(data?.error || "Failed to load billing diagnostics.");
    } catch {
      setBillingStatus(null);
      setBillingStatusError("Failed to load billing diagnostics.");
    }
  }

  async function refreshDiagnostics() {
    setRefreshingDiagnostics(true);
    await loadBillingStatus();
    setRefreshingDiagnostics(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setSuccessPack(params.get("pack") || "credits");
      window.history.replaceState({}, "", "/dashboard/billing");
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [packsRes, balanceRes] = await Promise.all([
          fetch("/api/billing/checkout"),
          fetch("/api/credits/balance"),
        ]);

        if (packsRes.ok) {
          const data = await packsRes.json();
          setPacks(data.packs);
        }

        if (balanceRes.ok) {
          const data = await balanceRes.json();
          setBalance(data.balance);
          setPlan(data.plan);
          setProExpiresAt(data.pro_expires_at || null);
          setTransactions(data.recent_transactions || []);
        }

        await loadBillingStatus();
      } catch (err) {
        console.error("Failed to load billing data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const variantByPackId = new Map(
    (billingStatus?.remote.variants || []).map((variant) => [variant.packId, variant])
  );

  const getPackAvailability = (packId: string) => {
    if (!billingStatus) {
      return { enabled: true, reason: null as string | null };
    }

    if (!billingStatus.remote.apiKeyValid || !billingStatus.remote.storeAccessible) {
      return {
        enabled: false,
        reason: billingStatus.remote.errors[0] || "Checkout provider is not reachable right now.",
      };
    }

    if (!billingStatus.database.ready) {
      return {
        enabled: false,
        reason: billingStatus.database.errors[0] || "Billing database checks failed.",
      };
    }

    const variant = variantByPackId.get(packId);
    if (!variant) {
      return {
        enabled: false,
        reason: "No checkout variant is configured for this pack yet.",
      };
    }

    if (!variant.configured) {
      return {
        enabled: false,
        reason: `Checkout is not configured for this pack yet (${variant.envKey}).`,
      };
    }

    if (!variant.accessible) {
      return {
        enabled: false,
        reason: variant.errors[0] || "This pack is not reachable from Lemon Squeezy right now.",
      };
    }

    return { enabled: true, reason: null as string | null };
  };

  async function handlePurchase(packId: string) {
    setCheckoutError(null);

    const availability = getPackAvailability(packId);
    if (!availability.enabled) {
      setCheckoutError({ packId, message: availability.reason || "Checkout is unavailable for this pack." });
      return;
    }

    setPurchasing(packId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_id: packId }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (!res.ok) {
        setCheckoutError({
          packId,
          message: data.error || "Checkout is unavailable right now.",
        });
        await refreshDiagnostics();
      } else {
        setNotice({
          title: "Checkout Error",
          message: data.error || "Failed to create checkout session",
        });
      }
    } catch {
      setNotice({
        title: "Checkout Error",
        message: "Network error. Please try again.",
      });
    } finally {
      setPurchasing(null);
    }
  }

  const isEnterprise = plan === "enterprise";
  const trialExpiry = proExpiresAt ? new Date(proExpiresAt) : null;
  const now = new Date();
  const hasPermanentWorkspaceAccess = plan === "pro" && !proExpiresAt;
  const hasActiveWorkspaceTrial = plan === "pro" && trialExpiry !== null && trialExpiry > now;
  const hasExpiredWorkspaceTrial = plan === "free" && trialExpiry !== null && trialExpiry <= now;
  const daysUntilTrialEnds = trialExpiry && trialExpiry > now
    ? Math.ceil((trialExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : 0;
  const trialEndingSoon = daysUntilTrialEnds > 0 && daysUntilTrialEnds <= 7;
  const daysSinceTrialEnded = trialExpiry && trialExpiry <= now
    ? Math.floor((now.getTime() - trialExpiry.getTime()) / (24 * 60 * 60 * 1000))
    : 0;
  const resolvedSuccessPack = packs.find((pack) => pack.id === successPack) || null;

  const accessState = isEnterprise
    ? {
        title: "Enterprise",
        body: "Unlimited credits and full workspace access are already active.",
      }
    : hasPermanentWorkspaceAccess
    ? {
        title: "Workspace access active",
        body: "Paid workspace access is permanent. Future purchases add credits only.",
      }
    : hasActiveWorkspaceTrial
    ? {
        title: `Trial active · ${daysUntilTrialEnds} day${daysUntilTrialEnds === 1 ? "" : "s"} left`,
        body: `Trial ends ${trialExpiry?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. Your first completed purchase unlocks permanent workspace access.`,
      }
    : hasExpiredWorkspaceTrial
    ? {
        title: `Trial ended ${daysSinceTrialEnded > 0 ? `${daysSinceTrialEnded} day${daysSinceTrialEnded === 1 ? "" : "s"} ago` : "today"}`,
        body: "Your data is safe. Buy any pack to unlock permanent workspace access.",
      }
    : {
        title: "Free access",
        body: "Local CLI is free. Buy any pack when you want shared cloud workflows and Workspace access.",
      };

  const checkoutIssues = [
    ...(billingStatus?.missing.length
      ? [`Missing billing config: ${billingStatus.missing.join(", ")}`]
      : []),
    ...(billingStatus?.remote.errors || []),
    ...((billingStatus?.remote.variants || []).flatMap((variant) =>
      variant.errors.map((error) => `${variant.packId}: ${error}`)
    )),
    ...(billingStatus?.database.errors || []),
    ...(billingStatusError ? [billingStatusError] : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Credits & Workspace</h1>
            <p className="text-slate-500 mt-1">
              One-time purchases. No seat-based pricing. Your first completed purchase unlocks permanent workspace access. Credits never expire.
            </p>
          </div>
        </div>

        {successPack && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-medium text-emerald-900">
              {resolvedSuccessPack
                ? `${resolvedSuccessPack.name} added ${resolvedSuccessPack.credits.toLocaleString()} credits and workspace access is active.`
                : "Credits added and workspace access is active."}
            </p>
            <button
              onClick={() => setSuccessPack(null)}
              className="ml-auto text-emerald-600 hover:text-emerald-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Zap className="w-4 h-4 text-amber-500" />
              Balance
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {isEnterprise ? <span className="text-emerald-600">Unlimited</span> : balance.toLocaleString()}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {isEnterprise
                ? "Enterprise workspaces do not spend prepaid credits."
                : "Credits are only spent on compute-heavy cloud actions."}
            </p>
          </div>

          <div className={`rounded-2xl border p-5 ${
            hasPermanentWorkspaceAccess || isEnterprise
              ? "border-emerald-200 bg-emerald-50"
              : hasActiveWorkspaceTrial
              ? trialEndingSoon
                ? "border-amber-200 bg-amber-50"
                : "border-indigo-200 bg-indigo-50"
              : "border-slate-200 bg-white"
          }`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Shield className="w-4 h-4 text-indigo-500" />
              Workspace access
            </div>
            <div className="mt-3 text-lg font-bold text-slate-900">{accessState.title}</div>
            <p className="mt-2 text-sm text-slate-600">{accessState.body}</p>
          </div>

          <div className={`rounded-2xl border p-5 ${
            billingStatus && billingStatus.checkoutReady
              ? "border-emerald-200 bg-emerald-50"
              : checkoutIssues.length > 0
              ? "border-rose-200 bg-rose-50"
              : "border-slate-200 bg-white"
          }`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CreditCard className="w-4 h-4 text-slate-500" />
              Checkout
            </div>
            <div className="mt-3 text-lg font-bold text-slate-900">
              {billingStatus
                ? billingStatus.checkoutReady
                  ? "Ready"
                  : "Needs attention"
                : "Not checked"}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {billingStatus
                ? billingStatus.checkoutReady
                  ? "Billing config, Lemon Squeezy, and database checks all passed."
                  : "One or more billing checks failed. See diagnostics before you buy."
                : "If checkout fails, refresh diagnostics to see whether config, Lemon Squeezy, or the billing DB is the problem."}
            </p>
          </div>
        </div>

        {(checkoutIssues.length > 0 || checkoutError !== null) && (
          <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-900">
                  <AlertTriangle className="w-4 h-4" />
                  Checkout diagnostics
                </div>
                <p className="mt-1 text-sm text-rose-800">
                  Checkout is not fully healthy right now. The page now shows whether the blocker is billing config, Lemon Squeezy, or the billing database.
                </p>
              </div>
              <button
                onClick={refreshDiagnostics}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50"
              >
                {refreshingDiagnostics ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh diagnostics
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-rose-100 bg-white/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Config</div>
                <div className="mt-2 text-sm text-slate-700">
                  {billingStatus?.missing.length
                    ? `Missing: ${billingStatus.missing.join(", ")}`
                    : "No missing billing env keys detected."}
                </div>
              </div>
              <div className="rounded-xl border border-rose-100 bg-white/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lemon Squeezy</div>
                <div className="mt-2 text-sm text-slate-700">
                  {billingStatus?.remote.errors[0]
                    ? billingStatus.remote.errors[0]
                    : billingStatus?.remote.storeAccessible
                    ? `Connected to ${billingStatus.remote.storeName || "your store"}.`
                    : "Store connectivity has not been confirmed yet."}
                </div>
              </div>
              <div className="rounded-xl border border-rose-100 bg-white/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Database</div>
                <div className="mt-2 text-sm text-slate-700">
                  {billingStatus?.database.errors[0]
                    ? billingStatus.database.errors[0]
                    : billingStatus?.database.ready
                    ? "Billing tables and credit-cost rows look healthy."
                    : "Database billing checks have not completed yet."}
                </div>
              </div>
            </div>

            {billingStatus?.remote.variants.length ? (
              <div className="mt-4 rounded-xl border border-rose-100 bg-white/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pack availability</div>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {billingStatus.remote.variants.map((variant) => (
                    <div key={variant.packId} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 capitalize">{variant.packId}</span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          variant.accessible
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}>
                          {variant.accessible ? "ready" : "blocked"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {variant.accessible
                          ? variant.variantName || "Variant reachable"
                          : variant.errors[0] || `Missing ${variant.envKey}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Credit Packs */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Credit Packs
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Each pack adds credits. Your first completed purchase also unlocks permanent workspace access.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packs.map((pack) => {
              const presentation = PACK_PRESENTATION[pack.id];
              const availability = getPackAvailability(pack.id);
              const isFeatured = pack.id === "team";

              return (
                <div
                  key={pack.id}
                  className={`rounded-2xl border p-5 flex flex-col ${
                    isFeatured
                      ? "border-amber-300 ring-1 ring-amber-200 bg-white"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isFeatured
                        ? "text-amber-700 bg-amber-100"
                        : "text-slate-600 bg-slate-100"
                    }`}>
                      {presentation?.eyebrow || pack.name}
                    </span>
                    {availability.enabled ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        Unavailable
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900">{pack.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{presentation?.description}</p>

                  <div className="mt-5">
                    <div className="text-3xl font-bold text-slate-900">{pack.price}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {pack.credits.toLocaleString()} credits · {pack.perCreditCost} / credit
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {buildPackExamples(pack.credits).map((example) => (
                      <span
                        key={example}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                      >
                        {example}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 text-xs text-slate-500">{presentation?.bestFor}</p>

                  <button
                    onClick={() => handlePurchase(pack.id)}
                    disabled={!!purchasing || !availability.enabled}
                    className={`mt-5 w-full py-2.5 rounded-lg text-sm font-medium transition ${
                      isFeatured
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {purchasing === pack.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      `Buy ${pack.name}`
                    )}
                  </button>

                  {checkoutError?.packId === pack.id && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {checkoutError.message}
                    </div>
                  )}

                  {!availability.enabled && checkoutError?.packId !== pack.id && availability.reason && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {availability.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,1.4fr] mb-10">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Workspace access includes
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Shared cloud workflows and governance stay unlocked after your first completed purchase.
              </p>
            </div>
            <div className="grid gap-2 p-5 sm:grid-cols-2">
              {WORKSPACE_FEATURES.map((feature) => (
                <div key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                What credits buy
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Credits are only consumed by compute-heavy actions. Team actions, exports, and workspace features stay unlocked after purchase.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
                  <th className="px-5 py-2.5">Action</th>
                  <th className="px-5 py-2.5">Credits</th>
                  <th className="px-5 py-2.5">Why it costs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CREDIT_COSTS.map((row) => (
                  <tr key={row.action}>
                    <td className="px-5 py-3 font-medium text-slate-900">{row.action}</td>
                    <td className="px-5 py-3 font-mono text-slate-700">{row.credits}</td>
                    <td className="px-5 py-3 text-slate-500">{row.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Recent Activity
            </h3>
          </div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No transactions yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-slate-900">{tx.description}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-mono font-medium ${
                      tx.amount > 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NoticeModal
        isOpen={notice !== null}
        onClose={() => setNotice(null)}
        title={notice?.title || "Notice"}
        message={notice?.message || ""}
        tone="error"
      />
    </div>
  );
}
