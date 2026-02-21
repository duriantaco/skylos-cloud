"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Zap,
  Package,
  CheckCircle,
  Loader2,
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
};

export default function BillingPage() {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [plan, setPlan] = useState<string>("free");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successPack, setSuccessPack] = useState<string | null>(null);

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
        alert(data.error || "Failed to create checkout session");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setPurchasing(null);
    }
  }

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
            <h1 className="text-2xl font-bold text-slate-900">Credits</h1>
            <p className="text-slate-500 mt-1">
              One-time purchases. No subscriptions. Credits never expire.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-slate-500">Balance</p>
              <p className="text-2xl font-bold text-slate-900">
                {plan === "enterprise" ? (
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
              Credits added to your account.
            </p>
            <button
              onClick={() => setSuccessPack(null)}
              className="ml-auto text-emerald-600 hover:text-emerald-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Credit Packs */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Credit Packs
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Each scan upload costs 1 credit. AI remediation costs 10 credits.
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
    </div>
  );
}
