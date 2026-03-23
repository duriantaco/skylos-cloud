import type { Metadata } from "next";
// app/dashboard/layout.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getEffectivePlan } from "@/lib/entitlements";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Target, FolderOpen, TrendingUp, Zap, Bot, type LucideIcon } from "lucide-react";
import DashboardUserMenu from "@/components/DashboardUserMenu";
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
  credits: number | null;
  plan: string | null;
  pro_expires_at: string | null;
};

function getMemberOrganization(value: MemberOrganization | MemberOrganization[] | null | undefined): MemberOrganization | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

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
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations(credits, plan, pro_expires_at)")
    .eq("user_id", user.id)
    .maybeSingle();

  const org = getMemberOrganization(member?.organizations as MemberOrganization | MemberOrganization[] | null | undefined);

  if (org) {
    credits = org.credits ?? 0;
    plan = getEffectivePlan({ plan: org.plan || "free", pro_expires_at: org.pro_expires_at });
  }

  const isUnlimited = plan === "enterprise";

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900">
              <Image src={dogImg} alt="Skylos" width={32} height={32} className="h-8 w-8 object-contain" priority />
              Skylos
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/dashboard" icon={Target}>Mission Control</NavLink>
              <NavLink href="/dashboard/trends" icon={TrendingUp}>Trends</NavLink>
              <NavLink href="/dashboard/projects" icon={FolderOpen}>Projects</NavLink>
              <NavLink href="/dashboard/agent-activity" icon={Bot}>Agent</NavLink>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Credit balance badge */}
            {credits !== null && (
              <Link
                href="/dashboard/billing"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                  isUnlimited
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : credits < 50
                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                    : credits < 200
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                {isUnlimited ? "Unlimited" : credits.toLocaleString()}
              </Link>
            )}

            <a href="https://docs.skylos.dev" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-slate-900 transition flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span className="hidden md:inline">Docs</span>
            </a>
            <div className="h-4 w-px bg-slate-200" />
            <DashboardUserMenu email={user.email || ""} logoutAction="/auth/logout" />
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
