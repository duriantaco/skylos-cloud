'use client';

import { useEffect, useState } from 'react';
import { Coins, TrendingUp, TrendingDown, RefreshCw, Zap } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface CreditsData {
  balance: number;
  org_name: string;
  plan: string;
  last_updated: string;
  recent_transactions: Transaction[];
}

export default function CreditsDisplay({ inline = false }: { inline?: boolean }) {
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits/balance');
      if (response.ok) {
        const data = await response.json();
        setCredits(data);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCredits();
  };

  if (loading) {
    return (
      <div className={inline ? "animate-pulse" : "bg-white border border-slate-200 rounded-xl p-6"}>
        <div className="h-6 bg-slate-200 rounded w-24"></div>
      </div>
    );
  }

  if (!credits) {
    return null;
  }

  const isLow = credits.balance < 100;
  const isVeryLow = credits.balance < 50;
  const isUnlimited = credits.plan === 'enterprise';

  // Inline version for navbar/sidebar
  if (inline) {
    return (
      <Link
        href="/dashboard/credits"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
          isVeryLow
            ? 'bg-red-50 text-red-700 hover:bg-red-100'
            : isLow
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
        }`}
      >
        {isUnlimited ? (
          <>
            <Zap className="w-4 h-4" />
            <span className="text-sm font-semibold">Unlimited</span>
          </>
        ) : (
          <>
            <Coins className="w-4 h-4" />
            <span className="text-sm font-semibold">{credits.balance.toLocaleString()}</span>
            <span className="text-xs text-slate-500">credits</span>
          </>
        )}
      </Link>
    );
  }

  // Full card version
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              isVeryLow ? 'bg-red-100' : isLow ? 'bg-amber-100' : 'bg-emerald-100'
            }`}>
              <Coins className={`w-6 h-6 ${
                isVeryLow ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Credit Balance</h3>
              <p className="text-sm text-slate-500">{credits.org_name}</p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Balance Display */}
        <div className="flex items-baseline gap-2 mb-2">
          {isUnlimited ? (
            <>
              <Zap className="w-8 h-8 text-purple-600" />
              <span className="text-4xl font-black text-slate-900">Unlimited</span>
            </>
          ) : (
            <>
              <span className="text-4xl font-black text-slate-900">
                {credits.balance.toLocaleString()}
              </span>
              <span className="text-lg text-slate-500">credits</span>
            </>
          )}
        </div>

        {/* Warning Messages */}
        {!isUnlimited && (
          <>
            {isVeryLow && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-700">⚠️ Running very low on credits</p>
                <p className="text-xs text-red-600 mt-1">Purchase more to continue using premium features</p>
              </div>
            )}
            {isLow && !isVeryLow && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-semibold text-amber-700">Running low on credits</p>
                <p className="text-xs text-amber-600 mt-1">Consider purchasing more soon</p>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        {!isUnlimited && (
          <div className="mt-4 flex gap-3">
            <Link
              href="/dashboard/credits/purchase"
              className="flex-1 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition text-center"
            >
              Buy Credits
            </Link>
            <Link
              href="/dashboard/credits/history"
              className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
            >
              View History
            </Link>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {credits.recent_transactions.length > 0 && (
        <div className="p-6">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Recent Activity</h4>
          <div className="space-y-3">
            {credits.recent_transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {tx.amount > 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm text-slate-900">{tx.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  tx.amount > 0 ? 'text-emerald-600' : 'text-slate-600'
                }`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
