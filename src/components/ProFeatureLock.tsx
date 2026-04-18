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
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Paid Workspace Feature</span>
          </div>
          <p className="text-sm font-medium text-slate-900">{feature}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/workspace-governance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition"
            >
              See Workspace Governance
            </Link>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
            >
              Unlock paid workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
