'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  FolderOpen,
  Layers3,
  ScanSearch,
  Sparkles,
  Shield,
  ShieldCheck,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  startsWith?: string;
};

const PRIMARY_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Activity },
  { href: "/dashboard/projects", label: "Projects", icon: FolderOpen, startsWith: "/dashboard/projects" },
  { href: "/dashboard/scans", label: "Scans", icon: ScanSearch, startsWith: "/dashboard/scans" },
  { href: "/dashboard/issues", label: "Issues", icon: Layers3, startsWith: "/dashboard/issues" },
  { href: "/dashboard/exceptions", label: "Exceptions", icon: ShieldCheck, startsWith: "/dashboard/exceptions" },
  { href: "/dashboard/rules", label: "Rules", icon: Shield, startsWith: "/dashboard/rules" },
  { href: "/dashboard/trends", label: "Trends", icon: Sparkles, startsWith: "/dashboard/trends" },
];

function itemIsActive(pathname: string, item: NavItem) {
  if (item.href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname.startsWith(item.startsWith || item.href);
}

function NavGroup({ items, title }: { items: NavItem[]; title: string }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </div>
      <div className="mt-2 space-y-1">
        {items.map((item) => {
          const isActive = itemIsActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-4 w-4 transition",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700",
                ].join(" ")}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardSidebarNav() {
  return (
    <NavGroup title="Workspace" items={PRIMARY_ITEMS} />
  );
}
