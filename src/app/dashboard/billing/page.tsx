"use client";

import NoticeModal from "@/components/NoticeModal";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Zap,
  Package,
  CheckCircle,
  Loader2,
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

const WORKSPACE_FEATURES = [
  "One shared baseline across repos",
  "Controlled project inheritance and overrides",
  "Exception queue, decision trail, and evidence export",
  "Full trend analytics, compare, and history",
  "Team collaboration (comments, assignments)",
  "Slack and Discord integrations",
  "Advanced gate modes and up to 50 custom rules",
  "90-day history retention",
  "Findings export (CSV/JSON)",
  "Credits never expire",
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
    description: "Unlock Workspace Governance and cover the first shared uploads and compares.",
    bestFor: "Best for the first repo, first baseline, and first shared history runs.",
  },
  builder: {
    eyebrow: "Small team",
    description: "Enough credits for a small team testing shared history, compare, and governance workflows.",
    bestFor: "Best for one or two repos with steady weekly usage.",
  },
  team: {
    eyebrow: "Daily workflow",
    description: "Balanced pack for teams using the web control layer every week.",
    bestFor: "Best for teams managing multiple repos with shared standards.",
  },
  scale: {
    eyebrow: "Heavy automation",
    description: "For frequent uploads, governance evidence, and AI-assisted actions across multiple repos.",
    bestFor: "Best for multi-repo automation and higher-volume review loops.",
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
  const [hasCompletedPurchase, setHasCompletedPurchase] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successPack, setSuccessPack] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<{ packId: string | null; message: string } | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

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
          setHasCompletedPurchase(Boolean(data.has_completed_purchase));
          setTransactions(data.recent_transactions || []);
        }
      } catch (err) {
        console.error("Failed to load billing data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handlePurchase(packId: string) {
    setCheckoutError(null);

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
  const hasPermanentWorkspaceAccess = hasCompletedPurchase || (plan === "pro" && !proExpiresAt);
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
        body: "Unlimited credits and full governance access are already active.",
      }
    : hasPermanentWorkspaceAccess
    ? {
        title: "Workspace Governance active",
        body: "The shared control layer is unlocked permanently. Future purchases add credits only.",
      }
    : hasActiveWorkspaceTrial
    ? {
        title: `Governance trial active · ${daysUntilTrialEnds} day${daysUntilTrialEnds === 1 ? "" : "s"} left`,
        body: `Trial ends ${trialExpiry?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. Your first completed purchase unlocks permanent Workspace Governance.`,
      }
    : hasExpiredWorkspaceTrial
    ? {
        title: `Governance trial ended ${daysSinceTrialEnded > 0 ? `${daysSinceTrialEnded} day${daysSinceTrialEnded === 1 ? "" : "s"} ago` : "today"}`,
        body: "Your data is safe. Buy any pack to unlock permanent Workspace Governance.",
      }
    : {
        title: "Local CLI only",
        body: "Local CLI scanning stays free. Buy any pack when you want shared web governance and cloud workflows.",
      };

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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Workspace Governance & Credits</h1>
              <p className="text-slate-500 mt-1">
                Local CLI stays free. One-time packs unlock Workspace Governance for the web app and fund compute-heavy actions. No seat-based pricing. Credits never expire.
              </p>
            </div>
            <Link
              href="/workspace-governance"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              See what governance includes
            </Link>
          </div>
        </div>

        {successPack && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-medium text-emerald-900">
              {resolvedSuccessPack
                ? `${resolvedSuccessPack.name} added ${resolvedSuccessPack.credits.toLocaleString()} credits and Workspace Governance is active.`
                : "Credits added and Workspace Governance is active."}
            </p>
            <button
              onClick={() => setSuccessPack(null)}
              className="ml-auto text-emerald-600 hover:text-emerald-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 mb-8">
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
            Workspace Governance
            </div>
            <div className="mt-3 text-lg font-bold text-slate-900">{accessState.title}</div>
            <p className="mt-2 text-sm text-slate-600">{accessState.body}</p>
          </div>

        </div>

        {/* Credit Packs */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Choose a pack
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Each pack permanently unlocks Workspace Governance for this workspace. Credits remain for uploads, compare, and AI-assisted actions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packs.map((pack) => {
              const presentation = PACK_PRESENTATION[pack.id];
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
                    disabled={!!purchasing}
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
                Workspace Governance includes
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your first purchase unlocks the shared control layer. Credits are only a usage meter for compute-heavy actions.
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
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Recent Activity
            </h3>
            <Link
              href="/dashboard/billing/history"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              View full history
            </Link>
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
