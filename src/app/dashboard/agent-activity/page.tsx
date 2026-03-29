import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Bot, GitBranch, GitCommit, Clock, Search, CheckCircle2,
  Wrench, Sparkles, AlertTriangle
} from "lucide-react";
import { ensureWorkspace } from "@/lib/ensureWorkspace";

type AgentRun = {
  id: string;
  created_at: string;
  command: string;
  model: string | null;
  provider: string | null;
  duration_seconds: number | null;
  commit_hash: string | null;
  branch: string | null;
  actor: string | null;
  status: string;
  summary: Record<string, any>;
  project_id: string;
  projects: { name: string } | null;
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

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds === undefined) return null;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const commandConfig: Record<string, { label: string; color: string; icon: any }> = {
  scan: { label: "Scan", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Search },
  verify: { label: "Verify", color: "bg-purple-50 text-purple-700 border-purple-200", icon: CheckCircle2 },
  remediate: { label: "Remediate", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Wrench },
  cleanup: { label: "Cleanup", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Sparkles },
};

function CommandBadge({ command }: { command: string }) {
  const config = commandConfig[command] || { label: command, color: "bg-slate-50 text-slate-600 border-slate-200", icon: Bot };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function summaryLine(command: string, summary: Record<string, any>): string {
  switch (command) {
    case "scan": {
      const total = summary.total ?? 0;
      if (total === 0) return "Clean scan";
      const parts = [];
      if (summary.both) parts.push(`${summary.both} high confidence`);
      if (summary.static_only) parts.push(`${summary.static_only} static`);
      if (summary.llm_only) parts.push(`${summary.llm_only} LLM`);
      return `${total} findings: ${parts.join(", ")}`;
    }
    case "verify": {
      const tp = summary.verified_true_positive ?? 0;
      const fp = summary.verified_false_positive ?? 0;
      return `${tp} confirmed dead, ${fp} false positives removed`;
    }
    case "remediate": {
      const fixed = summary.fixed ?? 0;
      const total = summary.total_findings ?? 0;
      const pr = summary.pr_url ? " (PR created)" : "";
      return `Fixed ${fixed}/${total} findings${pr}`;
    }
    case "cleanup": {
      const applied = summary.applied ?? 0;
      const total = summary.total_items ?? 0;
      return `Applied ${applied}/${total} improvements`;
    }
    default:
      return JSON.stringify(summary).slice(0, 80);
  }
}

function RunCard({ run }: { run: AgentRun }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Command + Project */}
          <div className="flex items-center gap-3 mb-3">
            <CommandBadge command={run.command} />
            <Link
              href={`/dashboard/projects/${run.project_id}`}
              className="font-semibold text-slate-900 hover:text-slate-700 transition"
            >
              {run.projects?.name || "Unknown Project"}
            </Link>
            {run.status === "failed" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-3 h-3" />
                Failed
              </span>
            )}
          </div>

          {/* Summary line */}
          <div className="text-sm text-slate-600 mb-3">
            {summaryLine(run.command, run.summary)}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {run.model && (
              <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded">
                {run.model}
              </span>
            )}
            {run.branch && (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {run.branch}
              </span>
            )}
            {run.commit_hash && (
              <span className="flex items-center gap-1 font-mono">
                <GitCommit className="w-3 h-3" />
                {run.commit_hash.slice(0, 7)}
              </span>
            )}
            {run.duration_seconds !== null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(run.duration_seconds)}
              </span>
            )}
            {run.actor && (
              <span className="text-slate-400">{run.actor}</span>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-sm text-slate-500 shrink-0">
          {timeAgo(run.created_at)}
        </div>
      </div>
    </div>
  );
}

export default async function AgentActivityPage() {
  const { user, orgId, supabase } = await ensureWorkspace();
  if (!user) {
    redirect("/login");
  }

  if (!orgId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">No Organization</h1>
          <p className="text-slate-500">Please set up your workspace first.</p>
        </div>
      </div>
    );
  }

  const { data: runs } = await supabase
    .from("agent_runs")
    .select("*, projects(name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  const runList = (runs as unknown as AgentRun[]) || [];

  const totalRuns = runList.length;
  const scanCount = runList.filter(r => r.command === "scan").length;
  const verifyCount = runList.filter(r => r.command === "verify").length;
  const remediateCount = runList.filter(r => r.command === "remediate" || r.command === "cleanup").length;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <header>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                <Bot className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Agent Activity</h1>
            </div>
            <p className="text-slate-500 text-sm">
              Recent agent commands across your projects. Scans, verifications, remediations, and cleanups.
            </p>
          </header>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Runs", value: totalRuns, color: "text-slate-900" },
              { label: "Scans", value: scanCount, color: "text-blue-600" },
              { label: "Verifications", value: verifyCount, color: "text-purple-600" },
              { label: "Remediations", value: remediateCount, color: "text-amber-600" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {runList.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
                <Bot className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">No Agent Runs Yet</h2>
                <p className="text-slate-500 mb-6">
                  Run an agent command to see activity here.
                </p>
                <code className="text-sm bg-slate-100 px-3 py-2 rounded-lg text-slate-700">
                  skylos agent verify . --model claude-sonnet-4-20250514
                </code>
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-500 px-1">
                  Showing {runList.length} most recent runs
                </div>
                {runList.map((run) => (
                  <RunCard key={run.id} run={run} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
