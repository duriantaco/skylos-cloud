import type { Metadata } from "next";
// app/dashboard/layout.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getEffectivePlan } from "@/lib/entitlements";
import Link from "next/link";
import Image from "next/image";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { BookOpen, LogOut, Settings, Zap } from "lucide-react";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import DashboardSidebarNav from "@/components/DashboardSidebarNav";
import {
  resolveActiveOrganizationForRequest,
  unwrapOrganization,
} from "@/lib/active-org";
import dogImg from "../../../public/assets/favicon-96x96.png";

export const metadata: Metadata = {
  title: "Dashboard — Skylos",
  description: "Manage Skylos projects, scans, policies, billing, and team activity.",
  robots: {
    index: false,
    follow: false,
  },
};

type MemberOrganization = {
  id: string | null;
  name: string | null;
  credits: number | null;
  plan: string | null;
  pro_expires_at: string | null;
};

const dashboardSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dashboard-sans",
  display: "swap",
});

const dashboardMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dashboard-mono",
  display: "swap",
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch credit balance for header
  let credits: number | null = null;
  let plan = "free";
  const activeOrg = await resolveActiveOrganizationForRequest<MemberOrganization>(
    supabase,
    user.id,
    {
      select: "org_id, role, organizations(id, name, credits, plan, pro_expires_at)",
    }
  );
  const org = unwrapOrganization(activeOrg.membership?.organizations);

  if (org) {
    credits = org.credits ?? 0;
    plan = getEffectivePlan({ plan: org.plan || "free", pro_expires_at: org.pro_expires_at });
  }

  const isUnlimited = plan === "enterprise";
  const organizations = activeOrg.memberships.map((membership) => {
    const organization = unwrapOrganization(membership.organizations);
    return {
      orgId: membership.org_id,
      name: organization?.name || "Untitled Workspace",
      role: membership.role || "member",
    };
  });

  return (
    <div className={`${dashboardSans.variable} ${dashboardMono.variable} dashboard-surface min-h-screen bg-[#f7f8fa] text-slate-900`}>
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-6">
              <Link href="/dashboard" className="flex items-center gap-3 text-slate-900">
                <Image src={dogImg} alt="Skylos" width={34} height={34} className="h-8 w-8 object-contain" priority />
                <div>
                  <div className="text-lg font-semibold tracking-tight">Skylos</div>
                  <div className="text-xs text-slate-500">Cloud security workspace</div>
                </div>
              </Link>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-4 py-5">
              <OrganizationSwitcher
                organizations={organizations}
                activeOrgId={activeOrg.orgId}
                className="w-full"
              />

              <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
                <DashboardSidebarNav />
              </div>

              <div className="mt-6 shrink-0 space-y-3 border-t border-slate-200 pt-4">
                {credits !== null && (
                  <Link
                    href="/dashboard/billing"
                    className={[
                      "flex items-center justify-between rounded-2xl border px-4 py-3 transition",
                      isUnlimited
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : credits < 50
                        ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                        : credits < 200
                        ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-white/70 p-2 shadow-sm">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Credits
                        </div>
                        <div className="mt-0.5 text-base font-semibold">
                          {isUnlimited ? "Unlimited" : credits.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500">Billing</span>
                  </Link>
                )}

                <a
                  href="https://docs.skylos.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  Docs
                </a>

                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                    {user.email?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{user.email || "Account"}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Account and workspace settings</div>
                  </div>
                  <Settings className="ml-auto h-4 w-4 text-slate-400" />
                </Link>

                <form action="/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <LogOut className="h-4 w-4 text-slate-400" />
                    Log out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md lg:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <Link href="/dashboard" className="flex items-center gap-2.5 text-slate-900">
                <Image src={dogImg} alt="Skylos" width={30} height={30} className="h-7 w-7 object-contain" priority />
                <span className="text-lg font-semibold tracking-tight">Skylos</span>
              </Link>
              <div className="flex items-center gap-2">
                {credits !== null ? (
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {isUnlimited ? "Unlimited" : credits.toLocaleString()}
                  </Link>
                ) : null}
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
                    {user.email?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <span className="sr-only">Open account and settings</span>
                </Link>
              </div>
            </div>
            <div className="scrollbar-none overflow-x-auto border-t border-slate-200 px-4 py-2">
              <div className="flex items-center gap-2">
                <OrganizationSwitcher
                  organizations={organizations}
                  activeOrgId={activeOrg.orgId}
                  className="min-w-[180px]"
                />
                <Link
                  href="/dashboard/projects"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
                >
                  Projects
                </Link>
                <Link
                  href="/dashboard/scans"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
                >
                  Scans
                </Link>
                <Link
                  href="/dashboard/issues"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
                >
                  Issues
                </Link>
                <Link
                  href="/dashboard/exceptions"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
                >
                  Exceptions
                </Link>
                <Link
                  href="/dashboard/rules"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
                >
                  Rules
                </Link>
              </div>
            </div>
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}
