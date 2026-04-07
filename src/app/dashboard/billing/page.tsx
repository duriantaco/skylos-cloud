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
  Clock,
  Check,
} from "lucide-react";

type CreditPack = {
  id: string;
  name: string;
  credits: number;
  price: string;
  priceCents: number;
  perCreditCost: string;
  proDays: number;
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

const PRO_FEATURES = [
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

const PRO_DURATION_LABELS: Record<string, string> = {
  starter: "30 days Pro",
  builder: "90 days Pro",
  team: "180 days Pro",
  scale: "365 days Pro",
};

export default function BillingPage() {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [plan, setPlan] = useState<string>("free");
  const [proExpiresAt, setProExpiresAt] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successPack, setSuccessPack] = useState<string | null>(null);
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

  // Pro status calculations
  const isProActive = plan === "pro" || plan === "enterprise";
  const isEnterprise = plan === "enterprise";
  const proExpiry = proExpiresAt ? new Date(proExpiresAt) : null;
  const now = new Date();
  const proExpired = !isEnterprise && proExpiry && proExpiry <= now;
  const daysUntilExpiry = proExpiry && proExpiry > now
    ? Math.ceil((proExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : 0;
  const proExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  const daysSinceExpired = proExpiry && proExpiry <= now
    ? Math.floor((now.getTime() - proExpiry.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

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
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Credits & Pro</h1>
            <p className="text-slate-500 mt-1">
              One-time purchases. No subscriptions. Credits never expire.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-slate-500">Balance</p>
              <p className="text-2xl font-bold text-slate-900">
                {isEnterprise ? (
                  <span className="text-emerald-600">Unlimited</span>
                ) : (
                  <>{balance.toLocaleString()}</>
                )}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        {successPack && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-medium text-emerald-900">
              Credits added and Pro access activated!
            </p>
            <button
              onClick={() => setSuccessPack(null)}
              className="ml-auto text-emerald-600 hover:text-emerald-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pro Status Display */}
        {!isEnterprise && (
          <div className="mb-8">
            {isProActive && !proExpired ? (
              <div className={`rounded-xl p-5 border-2 ${
                proExpiringSoon
                  ? "bg-amber-50 border-amber-200"
                  : "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Pro active — expires {proExpiry?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        <span className="text-slate-500 font-normal ml-1">({daysUntilExpiry} days remaining)</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Buy any pack to extend your Pro access</p>
                    </div>
                  </div>
                  {proExpiringSoon && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                      Expires soon
                    </span>
                  )}
                </div>
              </div>
            ) : proExpired ? (
              <div className="rounded-xl p-5 border-2 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Pro expired {daysSinceExpired > 0 ? `${daysSinceExpired} days ago` : "today"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Your credits and data are safe. Buy any pack to reactivate Pro.</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Free user — show what Pro unlocks */
              <div className="rounded-xl p-6 border-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">Buy any pack to unlock Pro</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {PRO_FEATURES.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Every credit pack includes Pro access: Starter 30 days | Builder 90 days | Team 180 days | Scale 365 days
                </p>
              </div>
            )}
          </div>
        )}

        {/* Credit Packs */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Credit Packs
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Each pack includes credits + Pro access. Duration stacks on repeat purchase.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className={`bg-white border rounded-xl p-5 flex flex-col ${
                  pack.id === "team"
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : "border-slate-200"
                }`}
              >
                {pack.id === "team" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full self-start mb-3">
                    Most Popular
                  </span>
                )}
                <h3 className="text-base font-semibold text-slate-900">
                  {pack.name}
                </h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {pack.price}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {pack.credits.toLocaleString()} credits
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {pack.perCreditCost} / credit
                </p>
                <p className="text-xs font-medium text-indigo-600 mt-1">
                  + {PRO_DURATION_LABELS[pack.id] || "Pro access"}
                </p>
                <button
                  onClick={() => handlePurchase(pack.id)}
                  disabled={!!purchasing}
                  className={`mt-4 w-full py-2 rounded-lg text-sm font-medium transition ${
                    pack.id === "team"
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  } disabled:opacity-50`}
                >
                  {purchasing === pack.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Buy Now"
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* What Credits Buy — Cost Reference */}
        <div className="mb-10 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              What credits buy
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Credits are only consumed by compute-heavy actions. Team actions (comments, assignments, exports) are free with Pro.
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
