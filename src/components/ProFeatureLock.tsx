'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';

type Props = {
  feature: string;
  description: string;
};

export default function ProFeatureLock({ feature, description }: Props) {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white rounded-lg border border-indigo-100 shrink-0">
          <Lock className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Pro Feature</span>
          </div>
          <p className="text-sm font-medium text-slate-900">{feature}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
          >
            Buy any credit pack to unlock Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
