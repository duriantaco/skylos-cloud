import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  CheckCircle2, XCircle, Clock, GitBranch, GitCommit, 
  ArrowRight, History, AlertTriangle, Shield
} from "lucide-react";

type Scan = {
  id: string;
  created_at: string;
  commit_hash: string | null;
  branch: string | null;
  quality_gate_passed: boolean | null;
  analysis_mode?: "static" | "hybrid" | "agent" | null;
  stats: {
    total?: number;
    new_issues?: number;
    legacy_issues?: number;
    danger_count?: number;
    by_severity?: Record<string, number>;
  } | null;
  projects: {
    id: string;
    name: string;
    repo_url: string | null;
  } | null;
};

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function GateBadge({ passed }: { passed: boolean | null }) {
  if (passed === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  }
  return passed ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" />
      Passed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
      <XCircle className="w-3 h-3" />
      Failed
    </span>
  );
}

function ScanCard({ scan }: { scan: Scan }) {
  const stats = scan.stats || {};
  const newIssues = stats.new_issues ?? 0;
  const legacyIssues = stats.legacy_issues ?? 0;
  const total = stats.total ?? newIssues + legacyIssues;
  const criticalHigh = (stats.by_severity?.CRITICAL ?? 0) + (stats.by_severity?.HIGH ?? 0);

  return (
    <Link
      href={`/dashboard/scans/${scan.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition group"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left side */}
        <div className="flex-1 min-w-0">
          {/* Project + Gate status */}
          <div className="flex items-center gap-3 mb-3">
            <span className="font-semibold text-slate-900 group-hover:text-gray-700 transition">
              {scan.projects?.name || "Unknown Project"}
            </span>
            <GateBadge passed={scan.quality_gate_passed} />
            {scan.analysis_mode && scan.analysis_mode !== "static" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                {scan.analysis_mode.toUpperCase()}
              </span>
            )}
          </div>

          {/* Branch + Commit */}
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
            {scan.branch && (
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                {scan.branch}
              </span>
            )}
            {scan.commit_hash && (
              <span className="flex items-center gap-1.5 font-mono text-xs">
                <GitCommit className="w-3.5 h-3.5" />
                {scan.commit_hash.slice(0, 7)}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs">
            {newIssues > 0 && (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {newIssues} new
              </span>
            )}
            <span className="text-slate-400">
              {legacyIssues} legacy
            </span>
            {criticalHigh > 0 && (
              <span className="flex items-center gap-1 text-rose-600 font-medium">
                <Shield className="w-3 h-3" />
                {criticalHigh} critical/high
              </span>
            )}
            {total === 0 && (
              <span className="text-emerald-600 font-medium">Clean scan ✓</span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="text-right shrink-0">
          <div className="text-sm text-slate-600 mb-1">{timeAgo(scan.created_at)}</div>
          <div className="text-xs text-slate-400">{formatDate(scan.created_at)}</div>
        </div>

        {/* Arrow */}
        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all mt-1" />
      </div>
    </Link>
  );
}

export default async function ScansPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">No Organization</h1>
          <p className="text-slate-500">Please set up your workspace first.</p>
        </div>
      </div>
    );
  }

  const { data: scans } = await supabase
    .from("scans")
    .select(`
      id, created_at, commit_hash, branch, quality_gate_passed, stats, analysis_mode,
      projects!inner(id, name, repo_url, org_id)
    `)
    .eq("projects.org_id", membership.org_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const scanList = (scans as unknown as Scan[]) || [];

  const totalScans = scanList.length;
  const passedScans = scanList.filter(s => s.quality_gate_passed === true).length;
  const failedScans = scanList.filter(s => s.quality_gate_passed === false).length;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                  <History className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Scan History</h1>
              </div>
              <p className="text-slate-500 text-sm">
                Point-in-time snapshots of your codebase. Each scan is an event, not an entity.
              </p>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 text-sm bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-center px-3">
                <div className="text-xl font-bold text-slate-900">{totalScans}</div>
                <div className="text-xs text-slate-500">Total</div>
              </div>
              <div className="text-center px-3 border-l border-slate-200">
                <div className="text-xl font-bold text-emerald-600">{passedScans}</div>
                <div className="text-xs text-slate-500">Passed</div>
              </div>
              <div className="text-center px-3 border-l border-slate-200">
                <div className="text-xl font-bold text-rose-600">{failedScans}</div>
                <div className="text-xs text-slate-500">Failed</div>
              </div>
            </div>
          </header>

          {/* Info box */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-gray-700 shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div className="text-sm">
                <p className="text-indigo-900">
                  <strong>Scans are events, not entities.</strong> Each scan captures the state of your code at a specific moment.
                </p>
                <p className="text-indigo-700/70 mt-1">
                  Looking for persistent issues across scans? Go to{" "}
                  <Link href="/dashboard/issues" className="font-medium text-gray-700 hover:text-indigo-800 underline">
                    Mission Control →
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Scan list */}
          <div className="space-y-3">
            {scanList.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">No Scans Yet</h2>
                <p className="text-slate-500 mb-6">
                  Run your first scan to see results here.
                </p>
                <Link
                  href="/dashboard/projects"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
                >
                  Go to Projects
                </Link>
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-500 px-1">
                  Showing {scanList.length} most recent scans
                </div>
                {scanList.map((scan) => (
                  <ScanCard key={scan.id} scan={scan} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}