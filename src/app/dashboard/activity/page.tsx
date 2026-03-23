import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Activity, Lock } from "lucide-react";
import dogImg from "../../../../public/assets/favicon-96x96.png";
import ActivityFeed from "@/components/ActivityFeed";
import { getEffectivePlan } from "@/lib/entitlements";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations(name, plan, pro_expires_at)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.org_id) {
    return redirect("/dashboard");
  }

  const orgData = (member.organizations as any);
  const effectivePlan = getEffectivePlan({ plan: orgData?.plan || "free", pro_expires_at: orgData?.pro_expires_at });
  const isFreePlan = effectivePlan === "free";

  if (isFreePlan) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <Link href="/dashboard" className="hover:text-slate-900">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-900">Activity</span>
          </div>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-12 text-center">
            <Lock className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-indigo-900 mb-2">Team Activity — Pro Feature</h2>
            <p className="text-sm text-indigo-700 mb-6 max-w-md mx-auto">
              Track your team's comments, assignments, suppressions, and resolutions with a full activity feed.
            </p>
            <a href="/dashboard/billing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition">
              Buy any credit pack to unlock Pro
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900">
            <Image src={dogImg} alt="Skylos" width={32} height={32} className="h-8 w-8 object-contain" priority />
            Skylos
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-slate-500 hover:text-slate-900 transition flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Docs
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/dashboard" className="hover:text-slate-900">Dashboard</Link>
          <span>/</span>
          <span className="text-slate-900">Activity</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Activity className="w-7 h-7 text-indigo-600" />
              Team Activity
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              See what your team has been working on
            </p>
          </div>
        </div>

        {/* Activity Feed */}
        <ActivityFeed />
      </div>
    </main>
  );
}
