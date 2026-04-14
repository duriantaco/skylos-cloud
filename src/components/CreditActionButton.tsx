'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { checkCredits, type FeatureKey } from '@/lib/credits';
import InsufficientCreditsInline from './InsufficientCreditsInline';
import ProFeatureLock from './ProFeatureLock';

type Props = {
  featureKey: FeatureKey;
  label: string;
  icon?: ReactNode;
  onAction: () => Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  plan: string;
  proFeatureName?: string;
  proFeatureDescription?: string;
};

export default function CreditActionButton({
  featureKey,
  label,
  icon,
  onAction,
  variant = 'primary',
  disabled = false,
  plan,
  proFeatureName,
  proFeatureDescription,
}: Props) {
  const [hasCredits, setHasCredits] = useState(true);
  const [balance, setBalance] = useState(0);
  const [required, setRequired] = useState(0);
  const [unlimited, setUnlimited] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Hooks MUST be called before any early return (Rules of Hooks)
  useEffect(() => {
    if (plan === 'free') {
      setChecking(false);
      return;
    }

    if (plan === 'enterprise') {
      setUnlimited(true);
      setHasCredits(true);
      setChecking(false);
      return;
    }

    checkCredits(featureKey).then((result) => {
      setHasCredits(result.hasCredits);
      setBalance(result.balance);
      setRequired(result.required);
      setUnlimited(result.unlimited);
      setChecking(false);
    });
  }, [featureKey, plan]);

  // Free users see ProFeatureLock instead (after hooks)
  if (plan === 'free') {
    return (
      <ProFeatureLock
        feature={proFeatureName || label}
        description={proFeatureDescription || `Unlock ${label} with Workspace access`}
      />
    );
  }

  const handleClick = async () => {
    if (!hasCredits && !unlimited) {
      setShowWarning(true);
      return;
    }

    setLoading(true);
    try {
      await onAction();
    } finally {
      setLoading(false);
    }
  };

  const variantClasses = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={disabled || loading || checking}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
      >
        {checking ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          icon
        )}
        {loading ? `${label}...` : label}
        {!unlimited && !checking && required > 0 && (
          <span className="text-xs opacity-75">({required} cr)</span>
        )}
      </button>

      {showWarning && !hasCredits && !unlimited && (
        <InsufficientCreditsInline
          creditsRequired={required}
          creditsAvailable={balance}
        />
      )}
    </div>
  );
}
