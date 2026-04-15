'use client';

import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Action = {
  href: string;
  label: string;
  tone?: "accent" | "default";
  scroll?: boolean;
};

const TONE_STYLES = {
  sky: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    accentButton: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
  },
  violet: {
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    accentButton: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
  },
} as const;

export default function ArtifactReceiptHeader({
  tone,
  breadcrumbLabel,
  badgeLabel,
  projectName,
  projectHref,
  title,
  description,
  note,
  actions,
}: {
  tone: keyof typeof TONE_STYLES;
  breadcrumbLabel: string;
  badgeLabel: string;
  projectName: string;
  projectHref?: string | null;
  title: string;
  description: string;
  note?: string | null;
  actions: Action[];
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href="/dashboard/scans" className="font-medium text-slate-600 hover:text-slate-900">
              Scans
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            {projectHref ? (
              <Link href={projectHref} className="font-medium text-slate-600 hover:text-slate-900">
                {projectName}
              </Link>
            ) : (
              <span className="font-medium text-slate-700">{projectName}</span>
            )}
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="font-semibold text-slate-900">{breadcrumbLabel}</span>
          </div>

          <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.badge}`}>
            {badgeLabel}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
          {note ? <p className="mt-3 text-xs text-slate-500">{note}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.href}:${action.label}`}
              href={action.href}
              scroll={action.scroll}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                action.tone === "accent"
                  ? styles.accentButton
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
