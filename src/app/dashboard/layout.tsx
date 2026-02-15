// app/dashboard/layout.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Target, FolderOpen, Settings, Shield, TrendingUp } from "lucide-react";
import dogImg from "../../../public/assets/favicon-96x96.png";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Shared Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900">
              <Image src={dogImg} alt="Skylos" width={32} height={32} className="h-8 w-8 object-contain" priority />
              Skylos
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                Beta
              </span>
            </Link>
            
            {/* Main Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/dashboard" icon={Target}>Mission Control</NavLink>
              <NavLink href="/dashboard/trends" icon={TrendingUp}>Trends</NavLink>
              <NavLink href="/dashboard/projects" icon={FolderOpen}>Projects</NavLink>
              <NavLink href="/dashboard/rules" icon={Shield}>Rules</NavLink>
              <NavLink href="/dashboard/settings" icon={Settings}>Settings</NavLink>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-slate-500 hover:text-slate-900 transition flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Docs
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-600 hidden md:block">{user.email}</span>
              <form action="/auth/logout" method="POST">
                <button type="submit" className="text-sm text-slate-400 hover:text-slate-600 transition">
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) {
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