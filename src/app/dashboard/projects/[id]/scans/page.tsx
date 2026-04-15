import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  GitCompareArrows,
  LineChart,
} from "lucide-react";

import ScanActions from "@/components/ScanActions";
import { getEffectivePlan } from "@/lib/entitlements";
import { ensureWorkspace } from "@/lib/ensureWorkspace";

type ScanStats = {
  danger_count?: number | null;
  quality_count?: number | null;
  dead_code_count?: number | null;
  secret_count?: number | null;
  new_issues?: number | null;
  suppressed_new_issues?: number | null;
};

type ScanRow = {
  id: string;
  created_at: string;
  branch?: string | null;
  commit_hash?: string | null;
  quality_gate_passed?: boolean | null;
  is_overridden?: boolean | null;
  stats?: ScanStats | null;
};

function countValue(value?: number | null) {
  return Number(value || 0);
}

function shortCommit(commit?: string | null) {
  return commit ? commit.slice(0, 7) : "—";
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function formatTimestamp(dateString: string) {
  return new Date(dateString).toLocaleString();
}

function gateState(scan: ScanRow) {
  if (scan.is_overridden) return "OVERRIDDEN" as const;
  return scan.quality_gate_passed ? "PASS" as const : "FAIL" as const;
}

function gateTone(state: ReturnType<typeof gateState>) {
  if (state === "PASS") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "OVERRIDDEN") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-red-200 bg-red-50 text-red-800";
}

function GateBadge({ state }: { state: ReturnType<typeof gateState> }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
        gateTone(state),
      ].join(" ")}
    >
      {state === "PASS" ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {state}
    </span>
  );
}

export default async function ProjectScansPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, orgId, supabase } = await ensureWorkspace();
  const { id } = await params;

  if (!user) {
    return redirect("/login");
  }
  if (!orgId) {
    return redirect("/dashboard");
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", orgId)
    .single();

  const effectivePlan = getEffectivePlan({
    plan: organization?.plan || "free",
    pro_expires_at: organization?.pro_expires_at || null,
  });
  const canCompare = effectivePlan === "pro" || effectivePlan === "enterprise";

  const { data: scansRaw } = await supabase
    .from("scans")
    .select("id, created_at, branch, commit_hash, quality_gate_passed, is_overridden, stats")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const scans = (scansRaw || []) as ScanRow[];
  const latestScan = scans[0] || null;

  return (
    <div className="py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Scan history</h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest {scans.length} scan{scans.length === 1 ? "" : "s"}. Open any scan to triage findings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/trends?projectId=${id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LineChart className="h-3.5 w-3.5" />
            Trends
          </Link>
          {canCompare && latestScan ? (
            <Link
              href={`/dashboard/scans/compare?b=${latestScan.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <GitCompareArrows className="h-3.5 w-3.5" />
              Compare
            </Link>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {scans.length === 0 ? (
          <div className="p-8 text-sm text-slate-600">
            No scans yet. Run{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">
              skylos . --danger --secrets --quality --upload
            </code>{" "}
            to populate this project.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Time</th>
                  <th className="px-6 py-3 text-left font-semibold">Branch</th>
                  <th className="px-6 py-3 text-left font-semibold">Commit</th>
                  <th className="px-6 py-3 text-left font-semibold">Gate</th>
                  <th className="px-6 py-3 text-right font-semibold">Blocking New</th>
                  <th className="px-6 py-3 text-right font-semibold">Suppressed</th>
                  <th className="px-6 py-3 text-right font-semibold">Security</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => {
                  const state = gateState(scan);
                  const compareToLatest =
                    canCompare && latestScan && latestScan.id !== scan.id
                      ? `/dashboard/scans/compare?a=${scan.id}&b=${latestScan.id}`
                      : null;

                  return (
                    <tr
                      key={scan.id}
                      className="border-b border-slate-100 last:border-b-0 transition hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3 text-slate-700">
                        <div className="font-medium">{timeAgo(scan.created_at)}</div>
                        <div className="text-xs text-slate-400">{formatTimestamp(scan.created_at)}</div>
                      </td>
                      <td className="px-6 py-3 text-slate-700">{scan.branch || "—"}</td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-700">{shortCommit(scan.commit_hash)}</td>
                      <td className="px-6 py-3">
                        <GateBadge state={state} />
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-slate-900">
                        {countValue(scan.stats?.new_issues)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-500">
                        {countValue(scan.stats?.suppressed_new_issues)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-700">
                        {countValue(scan.stats?.danger_count)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/dashboard/scans/${scan.id}`}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                          >
                            View
                          </Link>
                          {compareToLatest ? (
                            <Link
                              href={compareToLatest}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                            >
                              Compare
                            </Link>
                          ) : null}
                          <ScanActions scanId={scan.id} scanCommit={scan.commit_hash} plan={effectivePlan} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
