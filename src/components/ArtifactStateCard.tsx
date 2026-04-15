'use client';

import Link from "next/link";

type Action = {
  href: string;
  label: string;
  tone?: "accent" | "default";
  scroll?: boolean;
};

const TONE_STYLES = {
  default: {
    shell: "border-slate-200 bg-white",
    title: "text-slate-900",
    body: "text-slate-500",
    accentButton: "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200",
  },
  error: {
    shell: "border-red-200 bg-red-50",
    title: "text-red-900",
    body: "text-red-700",
    accentButton: "border-red-200 bg-white text-red-700 hover:bg-red-100",
  },
} as const;

export default function ArtifactStateCard({
  title,
  message,
  tone = "default",
  actions = [],
}: {
  title: string;
  message: string;
  tone?: keyof typeof TONE_STYLES;
  actions?: Action[];
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div className={`rounded-2xl border p-8 text-center ${styles.shell}`}>
      <h1 className={`text-lg font-bold ${styles.title}`}>{title}</h1>
      <p className={`mt-2 text-sm ${styles.body}`}>{message}</p>
      {actions.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.href}:${action.label}`}
              href={action.href}
              scroll={action.scroll}
              className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                action.tone === "accent"
                  ? styles.accentButton
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
