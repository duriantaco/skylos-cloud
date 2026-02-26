import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowUpRight,
  GitPullRequest,
  CheckCircle2,
  Box,
  Clock,
  Layers,
  History,
  AlertTriangle,
  TrendingUp,
  Eye,
  FileSearch,
  Zap,
  BarChart3,
} from "lucide-react";
import MiniSparkline from "@/components/MiniSparkline";

type ScanRow = {
  id: string;
  created_at: string;
  commit_hash: string | null;
  quality_gate_passed: boolean | null;
  stats: any;
  projects?: { name: string | null; repo_url: string | null } | null;
};

type IssueGroupRow = {
  id: string;
  rule_id: string;
  severity: string;
  category: string;
  canonical_file: string | null;
  canonical_line: number | null;
  occurrence_count: number | null;
  verification_status: string | null;
  project_id: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  last_seen_scan_id: string | null;
  scan_count?: number | null;
  projects?: { name: string | null; repo_url: string | null } | null;
};

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 3600) 
    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) 
    return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function sevRank(sev: string) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") 
    return 4;
  if (s === "HIGH") 
    return 3;
  if (s === "MEDIUM") 
    return 2;
  return 1;
}

function SeverityPill({ severity }: { severity: string }) {
  const s = String(severity || "").toUpperCase();
  const cls =
    s === "CRITICAL"
      ? "bg-rose-100 text-rose-700 ring-rose-600/20"
      : s === "HIGH"
      ? "bg-orange-100 text-orange-700 ring-orange-600/20"
      : s === "MEDIUM"
      ? "bg-amber-100 text-amber-700 ring-amber-600/20"
      : "bg-slate-100 text-slate-600 ring-slate-500/20";

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ring-1 ring-inset ${cls} uppercase tracking-wide`}>
      {s}
    </span>
  );
}

function GateBadge({ passed }: { passed: boolean | null }) {
  if (passed === null) 
    return <span className="text-slate-400 text-xs">—</span>;
  return passed ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 uppercase tracking-wide">
      <CheckCircle2 className="w-3 h-3" /> Passed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-600/20 uppercase tracking-wide">
      <AlertTriangle className="w-3 h-3" /> Failed
    </span>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  const { data: anyProject } = await supabase
    .from("projects")
    .select("org_id")
    .limit(1)
    .maybeSingle();

  const orgId = anyProject?.org_id as string | undefined;

  if (!orgId) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-2">Connect your first repository to start scanning.</p>
            <Link
              href="/dashboard/projects"
              className="inline-flex mt-6 items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-500 transition"
            >
              <Box className="w-4 h-4" />
              Connect Repository
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [
    { count: projectCount },
    { data: recentScansRaw },
    { data: openGroupsRaw, count: openGroupsCount },
    { data: criticalHighGroupsRaw, count: criticalHighCount },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }),

    supabase
      .from("scans")
      .select("id, created_at, commit_hash, quality_gate_passed, stats, projects(name, repo_url)")
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("issue_groups")
      .select(
        `id, rule_id, severity, category, canonical_file, canonical_line,
         occurrence_count, verification_status, project_id, 
         first_seen_at, last_seen_at, last_seen_scan_id,
         projects!inner(name, repo_url)`,
        { count: "exact" }
      )
      .eq("org_id", orgId)
      .eq("status", "open")
      .order("last_seen_at", { ascending: false })
      .limit(10),

    supabase
      .from("issue_groups")
      .select(
        `id, rule_id, severity, category, canonical_file, canonical_line,
         occurrence_count, verification_status, project_id,
         first_seen_at, last_seen_at, last_seen_scan_id,
         projects!inner(name, repo_url)`,
        { count: "exact" }
      )
      .eq("org_id", orgId)
      .eq("status", "open")
      .in("severity", ["CRITICAL", "HIGH"])
      .order("last_seen_at", { ascending: false })
      .limit(6),
  ]);

  const recentScans = (recentScansRaw as unknown as ScanRow[] | null) || [];
  const openGroups = (openGroupsRaw as unknown as IssueGroupRow[] | null) || [];
  const criticalHighGroups = (criticalHighGroupsRaw as unknown as IssueGroupRow[] | null) || [];

  const latestScan = recentScans[0] || null;
  const openCount = Number(openGroupsCount || 0);
  const urgentCount = Number(criticalHighCount || 0);

  const lastScanAt = latestScan?.created_at ? new Date(latestScan.created_at) : null;
  const daysSinceLastScan = lastScanAt
    ? Math.floor((Date.now() - lastScanAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isStale = daysSinceLastScan === null || daysSinceLastScan >= 3;

  const openSorted = openGroups.slice().sort((a, b) => {
    const d = sevRank(b.severity) - sevRank(a.severity);
    if (d !== 0) 
      return d;
    return new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime();
  });

  const passedScans = recentScans.filter((s) => s.quality_gate_passed === true).length;
  const failedScans = recentScans.filter((s) => s.quality_gate_passed === false).length;

  const sparklineScans = [...recentScans].reverse();
  const totalSparkline = sparklineScans.map((s) => {
    const st = s.stats || {};
    return (st.danger_count || 0) + (st.quality_count || 0) + (st.dead_code_count || 0) + (st.secret_count || 0);
  });
  const urgentSparkline = sparklineScans.map((s) => Number(s.stats?.new_issues ?? 0));
  const passSparkline = sparklineScans.map((s) => s.quality_gate_passed ? 1 : 0);

  return (
    <main className="min-h-screen bg-gray-50 text-slate-900 font-sans">
      <div className="p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          {/* HEADER */}
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Skylos Dashboard</h1>
              <p className="text-slate-500 mt-1 flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isStale ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`} />
                  {isStale ? "Scans stale" : "Scans fresh"}
                </span>
                <span className="text-slate-300">•</span>
                <span>{projectCount || 0} projects monitored</span>
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/dashboard/issues"
                className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-500 transition shadow-sm"
              >
                <Layers className="w-4 h-4" /> Mission Control
              </Link>
              <Link
                href="/dashboard/scans"
                className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition border border-slate-200 shadow-sm"
              >
                <History className="w-4 h-4" /> Scan History
              </Link>
            </div>
          </header>

          {/* QUICK STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" /> Open Issues
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{openCount}</div>
              <div className="mt-1 text-xs text-slate-500">Unique problems to triage</div>
              <MiniSparkline data={totalSparkline} color="#64748b" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-rose-600 text-xs font-medium uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" /> Urgent
              </div>
              <div className="mt-2 text-3xl font-bold text-rose-600">{urgentCount}</div>
              <div className="mt-1 text-xs text-slate-500">Critical + High severity</div>
              <MiniSparkline data={urgentSparkline} color="#e11d48" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
                <History className="w-3.5 h-3.5" /> Recent Scans
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{recentScans.length}</div>
              <div className="mt-1 text-xs text-slate-500">
                <span className="text-emerald-600">{passedScans} passed</span>
                {failedScans > 0 && <span className="text-rose-600"> • {failedScans} failed</span>}
              </div>
              <MiniSparkline data={passSparkline} color="#10b981" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" /> Last Scan
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">
                {latestScan ? timeAgo(latestScan.created_at).replace(" ago", "") : "—"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {latestScan ? latestScan.projects?.name : "No scans yet"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <section className="space-y-6">
              {/* Section Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-gray-700">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Mission Control</h2>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 max-w-md">
                    <span className="text-slate-700 font-medium">Issues are persistent problems</span> that exist across multiple scans. 
                    Each issue is deduplicated — fix it once, it's gone everywhere.
                  </p>
                </div>
                <Link
                  href="/dashboard/issues"
                  className="text-xs font-medium text-gray-700 hover:text-indigo-700 flex items-center gap-1"
                >
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Urgent Issues */}
              {urgentCount > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase tracking-wider mb-3">
                    <Zap className="w-3.5 h-3.5" /> Needs immediate attention
                  </div>
                  <div className="space-y-2">
                    {criticalHighGroups.slice(0, 3).map((g) => (
                      <Link
                        key={g.id}
                        href={`/dashboard/issues/${g.id}`}
                        className="block bg-white border border-rose-200 rounded-lg p-3 hover:border-rose-300 hover:shadow-sm transition group"
                      >
                        <div className="flex items-start gap-3">
                          <SeverityPill severity={g.severity} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900 truncate group-hover:text-rose-700 transition">
                              {g.rule_id}
                            </div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              {g.canonical_file}:{g.canonical_line}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 shrink-0">
                            {g.occurrence_count || 1}× across scans
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {urgentCount > 3 && (
                    <Link
                      href="/dashboard/issues?severity=critical,high"
                      className="mt-3 block text-center text-xs font-medium text-rose-700 hover:text-rose-800"
                    >
                      +{urgentCount - 3} more urgent issues →
                    </Link>
                  )}
                </div>
              )}

              {/* Open Issues List */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">Open Issues</span>
                  <span className="text-xs text-slate-500">{openCount} total</span>
                </div>

                {openSorted.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-medium text-slate-900">All clear!</div>
                    <div className="text-xs text-slate-500 mt-1">No open issues to triage.</div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {openSorted.slice(0, 6).map((g) => (
                      <Link
                        key={g.id}
                        href={`/dashboard/issues/${g.id}`}
                        className="block p-4 hover:bg-slate-50 transition group"
                      >
                        <div className="flex items-start gap-3">
                          <SeverityPill severity={g.severity} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 truncate group-hover:text-gray-700 transition">
                                {g.rule_id}
                              </span>
                              {g.verification_status === "VERIFIED" && (
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">
                                  Verified
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              {g.projects?.name} • {g.canonical_file}
                            </div>
                            {/* ISSUE-SPECIFIC METADATA */}
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                Seen {g.occurrence_count || 1}×
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                First: {g.first_seen_at ? formatDate(g.first_seen_at) : "—"}
                              </span>
                              <span>
                                Last: {g.last_seen_at ? timeAgo(g.last_seen_at) : "—"}
                              </span>
                            </div>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-gray-500 transition shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {openCount > 6 && (
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                    <Link
                      href="/dashboard/issues"
                      className="text-xs font-medium text-gray-700 hover:text-indigo-700 flex items-center justify-center gap-1"
                    >
                      View all {openCount} issues <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Issues Explainer */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-slate-200 text-slate-600 shrink-0">
                    <FileSearch className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <span className="text-slate-900 font-medium">Issues are entities, not events.</span> The same vulnerability 
                    appearing in 10 scans = 1 issue with 10 occurrences. Track lifecycle (open → fixed → reintroduced), 
                    assign owners, verify/refute, and add notes.
                  </div>
                </div>
              </div>
            </section>

            {/* ========================================== */}
            {/* RIGHT: SCAN TIMELINE (SCANS = EVENTS)     */}
            {/* ========================================== */}
            <section className="space-y-6">
              {/* Section Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
                      <History className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Scan Timeline</h2>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 max-w-md">
                    <span className="text-slate-700 font-medium">Scans are point-in-time snapshots.</span> Each scan 
                    records exactly what Skylos found on a specific commit — your immutable audit trail.
                  </p>
                </div>
                <Link
                  href="/dashboard/scans"
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Latest Scan Hero */}
              {latestScan && (
                <Link
                  href={`/dashboard/scans/${latestScan.id}`}
                  className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latest Scan</span>
                    <GateBadge passed={latestScan.quality_gate_passed} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${latestScan.quality_gate_passed ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold text-slate-900 truncate group-hover:text-gray-700 transition">
                        {latestScan.projects?.name || "Unknown Project"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {String(latestScan.commit_hash || "").slice(0, 7)}
                        </code>
                        <span>•</span>
                        <span>{timeAgo(latestScan.created_at)}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-gray-500 transition" />
                  </div>
                  {/* Scan stats */}
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {Number(latestScan.stats?.new_issues ?? 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">New</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-500">
                        {Number(latestScan.stats?.legacy_issues ?? 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Legacy</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-400">
                        {Number(latestScan.stats?.suppressed_new_issues ?? 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Suppressed</div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Scan History List */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">Recent Scans</span>
                  <span className="text-xs text-slate-500">
                    <span className="text-emerald-600">{passedScans}</span> / {recentScans.length} passed
                  </span>
                </div>

                {recentScans.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <GitPullRequest className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-medium text-slate-900">No scans yet</div>
                    <div className="text-xs text-slate-500 mt-1">Run your first scan to populate the timeline.</div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentScans.slice(1, 7).map((scan) => (
                      <Link
                        key={scan.id}
                        href={`/dashboard/scans/${scan.id}`}
                        className="block p-4 hover:bg-slate-50 transition group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              scan.quality_gate_passed ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 truncate group-hover:text-slate-700 transition">
                                {scan.projects?.name || "Unknown"}
                              </span>
                              <code className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {String(scan.commit_hash || "").slice(0, 7)}
                              </code>
                            </div>
                            {/* SCAN-SPECIFIC METADATA */}
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                              <span>New: {Number(scan.stats?.new_issues ?? 0)}</span>
                              <span>Legacy: {Number(scan.stats?.legacy_issues ?? 0)}</span>
                              <GateBadge passed={scan.quality_gate_passed} />
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 shrink-0">
                            {timeAgo(scan.created_at).replace(" ago", "")}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {recentScans.length > 7 && (
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                    <Link
                      href="/dashboard/scans"
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1"
                    >
                      View full scan history <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Scans Explainer */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-slate-200 text-slate-600 shrink-0">
                    <GitPullRequest className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <span className="text-slate-900 font-medium">Scans are events, not entities.</span> Use scans 
                    for audit trails, quality gate decisions, debugging ingestion, and historical evidence 
                    ("it was clean on Jan 29, broken on Jan 30").
                  </div>
                </div>
              </div>

              {/* Trends Quick Link */}
              <Link
                href="/dashboard/trends"
                className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition">
                      View Trends
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Track how your code quality changes over time
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition" />
                </div>
              </Link>

              {/* Add Project CTA */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 relative overflow-hidden">
                <h3 className="font-bold text-lg text-slate-900 mb-2 relative z-10">Add another project</h3>
                <p className="text-slate-600 text-sm mb-4 relative z-10">
                  Secure more repositories. Skylos is ready to scan.
                </p>
                <Link
                  href="/dashboard/projects"
                  className="block w-full text-center bg-gray-700 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-gray-500 transition relative z-10"
                >
                  Connect Repository
                </Link>
              </div>

              {/* Book a Demo CTA */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white relative overflow-hidden">
                <h3 className="font-bold text-lg mb-2 relative z-10">Need more from Skylos?</h3>
                <p className="text-slate-300 text-sm mb-4 relative z-10">
                  Get trend dashboards, PR decoration, team collaboration, and more with credits.
                </p>
                <a
                  href="mailto:founder@skylos.dev"
                  className="block w-full text-center bg-white text-slate-900 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-100 transition relative z-10"
                >
                  Book a Demo
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}