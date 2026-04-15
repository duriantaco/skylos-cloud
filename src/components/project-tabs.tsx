'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  key: string;
  label: string;
  segment: string;
};

const TABS: Tab[] = [
  { key: "overview", label: "Overview", segment: "" },
  { key: "scans", label: "Scans", segment: "scans" },
  { key: "issues", label: "Issues", segment: "issues" },
  { key: "suppressions", label: "Suppressions", segment: "suppressions" },
  { key: "defense", label: "Defense", segment: "defense" },
  { key: "provenance", label: "Provenance", segment: "provenance" },
  { key: "settings", label: "Settings", segment: "settings" },
];

function activeKey(pathname: string, projectId: string): string {
  const base = `/dashboard/projects/${projectId}`;
  if (pathname === base || pathname === `${base}/`) {
    return "overview";
  }
  for (const tab of TABS) {
    if (!tab.segment) continue;
    if (pathname.startsWith(`${base}/${tab.segment}`)) {
      return tab.key;
    }
  }
  return "overview";
}

function buildHref(projectId: string, segment: string): string {
  const base = `/dashboard/projects/${projectId}`;
  return segment ? `${base}/${segment}` : base;
}

export default function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const active = activeKey(pathname, projectId);

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <ul className="-mb-px flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            return (
              <li key={tab.key}>
                <Link
                  href={buildHref(projectId, tab.segment)}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "relative inline-flex items-center px-4 py-3 text-sm font-medium transition whitespace-nowrap",
                    isActive
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-900",
                  ].join(" ")}
                >
                  {tab.label}
                  {isActive ? (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-slate-900" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
