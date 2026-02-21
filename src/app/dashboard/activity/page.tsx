import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Activity } from "lucide-react";
import dogImg from "../../../../public/assets/favicon-96x96.png";
import ActivityFeed from "@/components/ActivityFeed";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.org_id) {
    return redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900">
            <Image src={dogImg} alt="Skylos" width={32} height={32} className="h-8 w-8 object-contain" priority />
            Skylos
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              Beta
            </span>
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
