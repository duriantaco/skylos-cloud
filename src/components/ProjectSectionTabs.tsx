import Link from "next/link";
import { Fingerprint, LayoutGrid, Shield, Slash } from "lucide-react";

type Section = "overview" | "defense" | "provenance" | "suppressions";

const ITEMS: Array<{
  key: Section;
  label: string;
  href: (projectId: string) => string;
  icon: typeof LayoutGrid;
}> = [
  {
    key: "overview",
    label: "Overview",
    href: (projectId) => `/dashboard/projects/${projectId}`,
    icon: LayoutGrid,
  },
  {
    key: "defense",
    label: "AI Defense",
    href: (projectId) => `/dashboard/projects/${projectId}/defense`,
    icon: Shield,
  },
  {
    key: "provenance",
    label: "AI Provenance",
    href: (projectId) => `/dashboard/projects/${projectId}/provenance`,
    icon: Fingerprint,
  },
  {
    key: "suppressions",
    label: "Suppressions",
    href: (projectId) => `/dashboard/projects/${projectId}/suppressions`,
    icon: Slash,
  },
];

export default function ProjectSectionTabs({
  projectId,
  active,
}: {
  projectId: string;
  active: Section;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href(projectId)}
            scroll
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
