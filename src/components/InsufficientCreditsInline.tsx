'use client';

import { AlertCircle, Coins } from 'lucide-react';
import Link from 'next/link';

type Props = {
  creditsRequired: number;
  creditsAvailable: number;
};

export default function InsufficientCreditsInline({ creditsRequired, creditsAvailable }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
      <span className="text-sm text-amber-700 font-medium">
        Need {creditsRequired} credits. You have {creditsAvailable}.
      </span>
      <Link
        href="/dashboard/billing"
        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shrink-0"
      >
        <Coins className="w-3 h-3" />
        Buy Credits
      </Link>
    </div>
  );
}
