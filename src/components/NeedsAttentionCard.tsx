import Link from "next/link";
import { AlertOctagon, ArrowRight } from "lucide-react";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) 
    return "just now";
  if (seconds < 3600) 
    return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) 
    return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

type ProjectLike = {
  id: string;
  name: string;
  scans?: Array<{
    created_at: string;
    quality_gate_passed?: boolean | null;
    stats?: { danger_count?: number; new_issues?: number } | null;
  }>;
};

export default function NeedsAttentionCard({ projects }: { projects: ProjectLike[] }) {
  const needsAttention = (projects || [])
    .map((p) => {
      const scans = (p.scans || []).slice().sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latest = scans[0];
      if (!latest) return null;

      const criticals = Number(latest?.stats?.danger_count || 0);
      const newIssues = Number(latest?.stats?.new_issues || 0);
      const failedGate = latest?.quality_gate_passed === false;

      const score = (failedGate ? 1_000_000 : 0) + criticals * 1000 + newIssues * 10;
      if (score <= 0) return null;

      let reason = "";
      if (failedGate) reason = "Quality gate failing";
      else if (criticals > 0) reason = `${criticals} critical issue${criticals !== 1 ? "s" : ""}`;
      else reason = `${newIssues} new issue${newIssues !== 1 ? "s" : ""}`;

      return {
        projectId: p.id,
        projectName: p.name,
        failedGate,
        criticals,
        newIssues,
        lastScanAt: latest.created_at,
        reason,
        score,
      };
    })
    .filter(Boolean) as Array<{
      projectId: string;
      projectName: string;
      failedGate: boolean;
      criticals: number;
      newIssues: number;
      lastScanAt: string;
      reason: string;
      score: number;
    }>;

  needsAttention.sort((a, b) => b.score - a.score);
  const top = needsAttention.slice(0, 5);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Needs Attention</h3>
        <AlertOctagon className="w-4 h-4 text-slate-400" />
      </div>

      {top.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-500">
          All good — no failing gates or new critical issues.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {top.map((item) => (
            <Link
              key={item.projectId}
              href={`/dashboard/projects/${item.projectId}`}
              className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition"
            >
              <div
                className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  item.failedGate ? "bg-red-100" : item.criticals > 0 ? "bg-red-100" : "bg-amber-100"
                }`}
              >
                <AlertOctagon
                  className={`w-4 h-4 ${
                    item.failedGate ? "text-red-600" : item.criticals > 0 ? "text-red-600" : "text-amber-700"
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{item.projectName}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {item.reason} • last scan {timeAgo(item.lastScanAt)}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {item.failedGate && (
                    <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                      Gate failing
                    </span>
                  )}
                  {item.criticals > 0 && (
                    <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                      {item.criticals} critical
                    </span>
                  )}
                  {item.newIssues > 0 && (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                      {item.newIssues} new
                    </span>
                  )}
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
