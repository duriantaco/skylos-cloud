'use client';

import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Action = {
  href: string;
  label: string;
  tone?: "accent" | "default";
  scroll?: boolean;
};

type MetadataItem = {
  label: string;
  value: string;
  mono?: boolean;
};

const TONE_STYLES = {
  slate: {
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    accentButton: "border-slate-300 bg-slate-900 text-white hover:bg-slate-800",
  },
  sky: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    accentButton: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
  },
  violet: {
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    accentButton: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
  },
} as const;

export default function ScanSurfaceHeader({
  tone,
  breadcrumbLabel,
  badgeLabel,
  projectName,
  projectHref,
  title,
  description,
  metadata = [],
  actions,
}: {
  tone: keyof typeof TONE_STYLES;
  breadcrumbLabel: string;
  badgeLabel: string;
  projectName: string;
  projectHref?: string | null;
  title: string;
  description: string;
  metadata?: MetadataItem[];
  actions: Action[];
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>

          {metadata.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {metadata.map((item) => (
                <div
                  key={`${item.label}:${item.value}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600"
                >
                  <span className="font-medium text-slate-500">{item.label}</span>
                  <span className={`ml-2 ${item.mono ? "font-mono text-slate-800" : "font-semibold text-slate-800"}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.href}:${action.label}`}
              href={action.href}
              scroll={action.scroll}
              className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-medium transition ${
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
