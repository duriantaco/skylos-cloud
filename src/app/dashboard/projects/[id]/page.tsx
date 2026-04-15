import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  GitCompareArrows,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { FileHotspotChart, TopViolationsChart } from "@/components/AdvanceCharts";
import MiniSparkline from "@/components/MiniSparkline";
import { getEffectivePlan } from "@/lib/entitlements";
import { ensureWorkspace } from "@/lib/ensureWorkspace";

type ScanStats = {
  danger_count?: number | null;
  quality_count?: number | null;
  dead_code_count?: number | null;
  secret_count?: number | null;
  new_issues?: number | null;
  legacy_issues?: number | null;
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

type FindingRow = {
  id: string;
  scan_id: string;
  rule_id?: string | null;
  file_path: string;
  line_number?: number | null;
  severity?: string | null;
  category?: string | null;
  is_new?: boolean | null;
  is_suppressed?: boolean | null;
};

type RuleCount = {
  ruleId: string;
  count: number;
};

function countValue(value?: number | null) {
  return Number(value || 0);
}

function totalFindings(stats?: ScanStats | null) {
  return (
    countValue(stats?.danger_count) +
    countValue(stats?.quality_count) +
    countValue(stats?.dead_code_count) +
    countValue(stats?.secret_count)
  );
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

function gateState(scan: ScanRow | null) {
  if (!scan) return "NONE" as const;
  if (scan.is_overridden) return "OVERRIDDEN" as const;
  return scan.quality_gate_passed ? "PASS" as const : "FAIL" as const;
}

function gateTone(state: ReturnType<typeof gateState>) {
  if (state === "PASS") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "OVERRIDDEN") return "border-amber-200 bg-amber-50 text-amber-900";
  if (state === "FAIL") return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function deltaMeta(current: number, previous: number, lowerIsBetter = true) {
  const delta = current - previous;
  if (delta === 0) {
    return { icon: Minus, label: "No change", className: "text-slate-500" };
  }
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return {
    icon: improved ? TrendingDown : TrendingUp,
    label: `${delta > 0 ? "+" : ""}${delta} vs previous`,
    className: improved ? "text-emerald-600" : "text-red-600",
  };
}

function fingerprint(finding: FindingRow) {
  return `${finding.rule_id || "unknown"}|${finding.file_path}|${finding.line_number || 0}`;
}

function countBySeverity(findings: FindingRow[]) {
  const counts: Record<string, number> = {};
  for (const finding of findings) {
    const severity = String(finding.severity || "unknown").toUpperCase();
    counts[severity] = (counts[severity] || 0) + 1;
  }
  return counts;
}

function topRules(findings: FindingRow[]) {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    const ruleId = finding.rule_id || "Unknown";
    counts.set(ruleId, (counts.get(ruleId) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([ruleId, count]) => ({ ruleId, count }))
    .sort((a, b) => b.count - a.count || a.ruleId.localeCompare(b.ruleId))
    .slice(0, 3);
}

function SeverityBreakout({
  counts,
  emptyLabel,
}: {
  counts: Record<string, number>;
  emptyLabel: string;
}) {
  const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"];
  const visible = order.filter((severity) => (counts[severity] || 0) > 0);
  if (visible.length === 0) {
    return <span className="text-xs text-slate-500">{emptyLabel}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((severity) => (
        <span
          key={severity}
          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
        >
          {counts[severity]} {severity.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  meta,
  sparkline,
}: {
  label: string;
  value: React.ReactNode;
  meta: React.ReactNode;
  sparkline?: number[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1.5 text-xs text-slate-500">{meta}</div>
      {sparkline && sparkline.length >= 2 ? (
        <div className="mt-2">
          <MiniSparkline data={sparkline} color="#0f172a" />
        </div>
      ) : null}
    </div>
  );
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
      {state === "NONE" ? "NO SCANS" : state}
    </span>
  );
}

function RuleList({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: RuleCount[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {rows.map((row) => (
            <div
              key={row.ruleId}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5"
            >
              <span className="font-mono text-xs text-slate-700">{row.ruleId}</span>
              <span className="text-xs font-semibold text-slate-500">{row.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, orgId, supabase } = await ensureWorkspace();
  const { id } = await params;

  if (!user) return redirect("/login");
  if (!orgId) return redirect("/dashboard");

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
  const previousComparableScan = latestScan
    ? scans.slice(1).find((scan) => (scan.branch || "") === (latestScan.branch || "")) || scans[1] || null
    : null;
  const recentScans = scans.slice(0, 15);

  const latestFindingsPromise = latestScan?.id
    ? supabase
        .from("findings")
        .select("id, scan_id, rule_id, file_path, line_number, severity, category, is_new, is_suppressed")
        .eq("scan_id", latestScan.id)
        .limit(5000)
    : Promise.resolve({ data: [] as FindingRow[] });

  const previousFindingsPromise = previousComparableScan?.id
    ? supabase
        .from("findings")
        .select("id, scan_id, rule_id, file_path, line_number, severity, category, is_new, is_suppressed")
        .eq("scan_id", previousComparableScan.id)
        .limit(5000)
    : Promise.resolve({ data: [] as FindingRow[] });

  const activeSuppressionsPromise = supabase
    .from("finding_suppressions")
    .select("*", { count: "exact", head: true })
    .eq("project_id", id)
    .is("revoked_at", null);

  const [latestFindingsResult, previousFindingsResult, activeSuppressionsResult] = await Promise.all([
    latestFindingsPromise,
    previousFindingsPromise,
    activeSuppressionsPromise,
  ]);

  const latestFindings = (latestFindingsResult.data || []) as FindingRow[];
  const previousFindings = (previousFindingsResult.data || []) as FindingRow[];
  const activeSuppressions = Number(activeSuppressionsResult.count || 0);

  const latestGate = gateState(latestScan);
  const previousGate = gateState(previousComparableScan);

  let streakCount = 0;
  if (latestScan) {
    for (const scan of scans) {
      if (gateState(scan) === latestGate) streakCount += 1;
      else break;
    }
  }

  const latestBlockingNew = countValue(latestScan?.stats?.new_issues);
  const previousBlockingNew = countValue(previousComparableScan?.stats?.new_issues);
  const latestSuppressed = countValue(latestScan?.stats?.suppressed_new_issues);
  const latestTotalFindings = totalFindings(latestScan?.stats);
  const previousTotalFindings = totalFindings(previousComparableScan?.stats);
  const latestCriticalHighBlockers = latestFindings.filter((finding) => {
    const severity = String(finding.severity || "").toUpperCase();
    return finding.is_new && !finding.is_suppressed && (severity === "CRITICAL" || severity === "HIGH");
  }).length;

  const latestFingerprintSet = new Set(latestFindings.map(fingerprint));
  const previousFingerprintSet = new Set(previousFindings.map(fingerprint));
  const newFindings = latestFindings.filter((finding) => !previousFingerprintSet.has(fingerprint(finding)));
  const resolvedFindings = previousFindings.filter((finding) => !latestFingerprintSet.has(fingerprint(finding)));
  const unchangedCount = latestFindings.filter((finding) => previousFingerprintSet.has(fingerprint(finding))).length;
  const newSeverityCounts = countBySeverity(newFindings);
  const resolvedSeverityCounts = countBySeverity(resolvedFindings);
  const newRuleLeaders = topRules(newFindings);
  const resolvedRuleLeaders = topRules(resolvedFindings);

  const historyBlocking = recentScans.slice().reverse().map((scan) => countValue(scan.stats?.new_issues));
  const historyPassRate = recentScans.slice().reverse().map((scan) => (gateState(scan) === "PASS" ? 1 : 0));
  const blockingDelta = deltaMeta(latestBlockingNew, previousBlockingNew);
  const totalDelta = deltaMeta(latestTotalFindings, previousTotalFindings);
  const BlockingDeltaIcon = blockingDelta.icon;
  const TotalDeltaIcon = totalDelta.icon;
  const compareHref =
    latestScan && previousComparableScan
      ? `/dashboard/scans/compare?a=${previousComparableScan.id}&b=${latestScan.id}`
      : null;

  if (!latestScan) {
    return (
      <div className="py-8">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">No scans yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Upload your first scan to see gate status, blocking issues, and trend data here.
          </p>
          <div className="mt-4 inline-flex items-center rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-800">
            skylos . --danger --secrets --quality --upload
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      {/* Header row: latest scan summary + primary action */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GateBadge state={latestGate} />
            <span className="text-xs text-slate-500">
              {latestScan.branch || "default branch"} · {timeAgo(latestScan.created_at)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {latestBlockingNew} blocking new issue{latestBlockingNew === 1 ? "" : "s"},{" "}
            {latestCriticalHighBlockers} critical/high.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {compareHref && canCompare ? (
            <Link
              href={compareHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <GitCompareArrows className="h-3.5 w-3.5" />
              Compare
            </Link>
          ) : null}
          <Link
            href={`/dashboard/scans/${latestScan.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Review latest scan
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Current health */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Latest Gate"
          value={<GateBadge state={latestGate} />}
          meta={`${latestScan.branch || "no branch"} · ${shortCommit(latestScan.commit_hash)}`}
        />
        <StatCard
          label="Blocking New"
          value={latestBlockingNew}
          meta={`${latestCriticalHighBlockers} critical/high unsuppressed`}
          sparkline={historyBlocking}
        />
        <StatCard
          label="Active Suppressions"
          value={activeSuppressions}
          meta={`${latestSuppressed} suppressed in latest scan`}
        />
        <StatCard
          label="Streak"
          value={latestScan ? `${streakCount} ${latestGate.toLowerCase()}` : "0"}
          meta="Consecutive scans with same gate"
          sparkline={historyPassRate}
        />
      </section>

      {/* What changed vs previous scan */}
      {previousComparableScan ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">What changed</h2>
              <p className="mt-1 text-sm text-slate-500">
                Comparing {shortCommit(latestScan.commit_hash)} against{" "}
                {shortCommit(previousComparableScan.commit_hash)}.
              </p>
            </div>
            {compareHref && canCompare ? (
              <Link
                href={compareHref}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Open deep compare →
              </Link>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Gate Transition"
              value={
                <div className="flex flex-wrap items-center gap-1.5">
                  <GateBadge state={previousGate} />
                  <span className="text-slate-400">→</span>
                  <GateBadge state={latestGate} />
                </div>
              }
              meta={
                previousGate === latestGate
                  ? "No gate change"
                  : `${previousGate.toLowerCase()} → ${latestGate.toLowerCase()}`
              }
            />
            <StatCard
              label="Blocking New"
              value={latestBlockingNew}
              meta={
                <span className={blockingDelta.className}>
                  <BlockingDeltaIcon className="mr-1 inline h-3 w-3" />
                  {blockingDelta.label}
                </span>
              }
            />
            <StatCard
              label="Introduced"
              value={newFindings.length}
              meta={<SeverityBreakout counts={newSeverityCounts} emptyLabel="No new findings" />}
            />
            <StatCard
              label="Resolved"
              value={resolvedFindings.length}
              meta={
                <span className={totalDelta.className}>
                  <TotalDeltaIcon className="mr-1 inline h-3 w-3" />
                  {unchangedCount} unchanged · {totalDelta.label}
                </span>
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <RuleList
              title="Top new rules"
              rows={newRuleLeaders}
              emptyLabel="No new rule families."
            />
            <RuleList
              title="Top resolved rules"
              rows={resolvedRuleLeaders}
              emptyLabel="No rule families resolved."
            />
          </div>

          {(newSeverityCounts && Object.keys(newSeverityCounts).length > 0) ||
          (resolvedSeverityCounts && Object.keys(resolvedSeverityCounts).length > 0) ? null : null}
        </section>
      ) : null}

      {/* Latest scan snapshot charts */}
      {latestFindings.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Latest scan snapshot</h2>
            <p className="mt-1 text-sm text-slate-500">
              Concentration of findings in the latest scan.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FileHotspotChart findings={latestFindings} />
            <TopViolationsChart findings={latestFindings} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
