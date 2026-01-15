import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRight, Shield, Clock, GitBranch, 
  TrendingUp, TrendingDown, Minus, Activity, CheckCircle, 
  XCircle, ExternalLink, BookOpen, Terminal, Zap, FolderOpen, AlertOctagon
} from "lucide-react";
import CreateProjectButton from "@/components/CreateProjectButton";
import CreateWorkspaceModal from "@/components/CreateWorkspaceModal";
import dogImg from "../../../public/assets/favicon-96x96.png";
import { trackEvent } from "@/lib/analytics";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function StatCard({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  trend, 
  color = "slate" 
}: { 
  label: string; 
  value: string | number; 
  subValue?: string; 
  icon: any; 
  trend?: "up" | "down" | "neutral";
  color?: "slate" | "red" | "emerald" | "amber";
}) {
  const colorStyles = {
    slate: "bg-slate-50 text-slate-600",
    red: "bg-red-50 text-red-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colorStyles[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === "up" ? "text-red-600" : trend === "down" ? "text-emerald-600" : "text-slate-400"
          }`}>
            {trend === "up" && <TrendingUp className="w-3.5 h-3.5" />}
            {trend === "down" && <TrendingDown className="w-3.5 h-3.5" />}
            {trend === "neutral" && <Minus className="w-3.5 h-3.5" />}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}
    </div>
  );
}

export default async function DashboardRoot() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();
  
  const orgId = member?.org_id;

  if (!orgId) {
    return (
      <main className="min-h-screen bg-slate-50">
        <CreateWorkspaceModal userEmail={user.email || ''} userId={user.id} />
        
        <div className="opacity-30 pointer-events-none">
          <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900">
                <Image src={dogImg} alt="Skylos" width={32} height={32} className="h-8 w-8 object-contain" />
                Skylos
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  Beta
                </span>
              </div>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="h-16 bg-slate-200 rounded-xl animate-pulse mb-8 max-w-md" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />)}
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-64 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { data: projects } = await supabase
    .from("projects")
    .select(`*, scans (id, created_at, branch, quality_gate_passed, stats, commit_hash)`)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const { data: recentScans } = await supabase
    .from("scans")
    .select(`*, projects!inner(id, name, org_id)`)
    .eq("projects.org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  const allScans = projects?.flatMap(p => p.scans || []) || [];
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const scansThisWeek = allScans.filter(s => new Date(s.created_at) > weekAgo);
  
  const totalCriticals = allScans.reduce((sum, s) => sum + (s.stats?.danger_count || 0), 0);
  const latestScans = projects?.map(p => {
    const sorted = (p.scans || []).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0];
  }).filter(Boolean) || [];

  const passingProjects = latestScans.filter(s => s?.quality_gate_passed).length;
  const failingProjects = latestScans.filter(s => s && !s.quality_gate_passed).length;

  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const scansLastWeek = allScans.filter(s => {
    const d = new Date(s.created_at);
    return d > twoWeeksAgo && d <= weekAgo;
  });
  const lastWeekCriticals = scansLastWeek.reduce((sum, s) => sum + (s.stats?.danger_count || 0), 0);
  const criticalTrend = totalCriticals > lastWeekCriticals ? "up" : totalCriticals < lastWeekCriticals ? "down" : "neutral";

  trackEvent('dashboard_view', orgId);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900">
            <Image
              src={dogImg}
              alt="Skylos"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
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
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-600 hidden md:block">{user.email}</span>
              <form action="/auth/logout" method="POST">
                <button 
                  type="submit"
                  className="text-sm text-slate-400 hover:text-slate-600 transition"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
              {projects?.length || 0} project{(projects?.length || 0) !== 1 ? 's' : ''} • {scansThisWeek.length} scan{scansThisWeek.length !== 1 ? 's' : ''} this week
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard/settings" 
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Settings
            </Link>
            <CreateProjectButton orgId={orgId} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Projects"
            value={projects?.length || 0}
            icon={FolderOpen}
            color="slate"
          />
          <StatCard
            label="Critical Issues"
            value={totalCriticals}
            subValue={criticalTrend === "down" ? "↓ from last week" : criticalTrend === "up" ? "↑ from last week" : "no change"}
            icon={AlertOctagon}
            trend={criticalTrend}
            color={totalCriticals > 0 ? "red" : "slate"}
          />
          <StatCard
            label="Passing Gates"
            value={`${passingProjects}/${latestScans.length}`}
            subValue={`${failingProjects} failing`}
            icon={Shield}
            color={failingProjects > 0 ? "amber" : "emerald"}
          />
          <StatCard
            label="Scans This Week"
            value={scansThisWeek.length}
            icon={Activity}
            color="slate"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Projects List - 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Projects</h2>
              <Link href="/dashboard/projects" className="text-sm text-slate-500 hover:text-slate-900 transition flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(!projects || projects.length === 0) ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No projects yet</h3>
                <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                  Connect your first repository to start scanning for security issues and code quality problems.
                </p>
                <CreateProjectButton orgId={orgId} />
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 6).map((p) => {
                  const scans = (p.scans || []).sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  );
                  const latestScan = scans[0];
                  const criticals = latestScan?.stats?.danger_count || 0;
                  const passed = latestScan?.quality_gate_passed;
                  const newIssues = latestScan?.stats?.new_issues || 0;

                  return (
                    <Link 
                      key={p.id} 
                      href={`/dashboard/projects/${p.id}`} 
                      className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition flex items-center gap-5"
                    >
                      {/* Status indicator */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        !latestScan ? 'bg-slate-100' : passed ? 'bg-emerald-50' : 'bg-red-50'
                      }`}>
                        {!latestScan ? (
                          <Clock className="w-5 h-5 text-slate-400" />
                        ) : passed ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>

                      {/* Project info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 truncate group-hover:text-slate-700 transition">
                            {p.name}
                          </h3>
                          {latestScan?.branch && (
                            <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              <GitBranch className="w-3 h-3" />
                              {latestScan.branch}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {latestScan ? (
                            <>
                              <span>Last scan {timeAgo(latestScan.created_at)}</span>
                              <span className="text-slate-300">•</span>
                              <span>{scans.length} total scan{scans.length !== 1 ? 's' : ''}</span>
                            </>
                          ) : (
                            <span>No scans yet</span>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 shrink-0">
                        {latestScan && (
                          <>
                            {criticals > 0 && (
                              <div className="text-center">
                                <div className="text-lg font-bold text-red-600">{criticals}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Critical</div>
                              </div>
                            )}
                            {newIssues > 0 && (
                              <div className="text-center">
                                <div className="text-lg font-bold text-amber-600">{newIssues}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">New</div>
                              </div>
                            )}
                            {criticals === 0 && newIssues === 0 && (
                              <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">
                                Clean
                              </div>
                            )}
                          </>
                        )}
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Recent Activity</h3>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>
              
              {(!recentScans || recentScans.length === 0) ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  No scans yet. Run your first scan to see activity here.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentScans.slice(0, 5).map((scan: any) => (
                    <Link 
                      key={scan.id}
                      href={`/dashboard/scans/${scan.id}`}
                      className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition"
                    >
                      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        scan.quality_gate_passed ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                        {scan.quality_gate_passed ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {scan.projects?.name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{timeAgo(scan.created_at)}</span>
                          {scan.branch && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="truncate">{scan.branch}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {scan.stats?.danger_count > 0 && (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          {scan.stats.danger_count}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Quick Actions</h3>
              </div>
              <div className="p-3 space-y-1">
                <Link 
                  href="/docs"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  Read Documentation
                </Link>
                <Link 
                  href="/docs#cli"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  <Terminal className="w-4 h-4 text-slate-400" />
                  Install CLI
                </Link>
                <Link 
                  href="/dashboard/settings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  <Zap className="w-4 h-4 text-slate-400" />
                  Configure Integrations
                </Link>
              </div>
            </div>

            {/* CLI Prompt */}
            <div className="bg-slate-900 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Start</span>
              </div>
              <div className="font-mono text-sm space-y-1.5">
                <div><span className="text-emerald-400">$</span> pip install skylos</div>
                <div><span className="text-emerald-400">$</span> skylos . --danger</div>
              </div>
              <a 
                href="https://pypi.org/project/skylos/" 
                target="_blank"
                className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
              >
                View on PyPI <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}