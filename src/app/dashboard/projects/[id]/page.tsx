import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  Fingerprint,
  GitCompareArrows,
  Minus,
  Settings,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import MiniSparkline from "@/components/MiniSparkline";
import ProjectSectionTabs from "@/components/ProjectSectionTabs";
import ScanActions from "@/components/ScanActions";
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
  provenance_agent_count?: number | null;
  provenance_confidence?: string | null;
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
  return commit ? commit.slice(0, 7) : "none";
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

function gateState(scan: ScanRow | null) {
  if (!scan) return "NONE" as const;
  if (scan.is_overridden) return "OVERRIDDEN" as const;
  return scan.quality_gate_passed ? "PASS" as const : "FAIL" as const;
}

function gateTone(state: ReturnType<typeof gateState>) {
  if (state === "PASS") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (state === "OVERRIDDEN") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (state === "FAIL") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function deltaMeta(current: number, previous: number, lowerIsBetter = true) {
  const delta = current - previous;

  if (delta === 0) {
    return {
      icon: Minus,
      label: "No change vs previous",
      className: "text-slate-500",
    };
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
    <div className="flex flex-wrap gap-2">
      {visible.map((severity) => (
        <span
          key={severity}
          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
        >
          {counts[severity]} {severity.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

function HealthCard({
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
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{meta}</div>
      {sparkline && sparkline.length >= 2 ? <MiniSparkline data={sparkline} color="#0f172a" /> : null}
    </div>
  );
}

function GateBadge({ state }: { state: ReturnType<typeof gateState> }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold",
        gateTone(state),
      ].join(" ")}
    >
      {state === "PASS" ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
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
        <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div
              key={row.ruleId}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
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

export default async function ProjectPage({
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

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, name, repo_url")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (projectErr || !project) {
    return (
      <main className="min-h-screen bg-gray-50 text-slate-900 font-sans">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="text-sm text-slate-600">Project not found.</div>
        </div>
      </main>
    );
  }

  const { data: scansRaw } = await supabase
    .from("scans")
    .select("id, created_at, branch, commit_hash, quality_gate_passed, is_overridden, provenance_agent_count, provenance_confidence, stats")
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
  const latestAiFiles = countValue(latestScan?.provenance_agent_count);

  const latestBlockingNew = countValue(latestScan?.stats?.new_issues);
  const previousBlockingNew = countValue(previousComparableScan?.stats?.new_issues);
  const latestSuppressed = countValue(latestScan?.stats?.suppressed_new_issues);
  const previousSuppressed = countValue(previousComparableScan?.stats?.suppressed_new_issues);
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
  const passRateWindow = recentScans.length
    ? Math.round((recentScans.filter((scan) => gateState(scan) === "PASS").length / recentScans.length) * 100)
    : 0;
  const blockingDelta = deltaMeta(latestBlockingNew, previousBlockingNew);
  const suppressedDelta = deltaMeta(latestSuppressed, previousSuppressed, false);
  const totalDelta = deltaMeta(latestTotalFindings, previousTotalFindings);
  const BlockingDeltaIcon = blockingDelta.icon;
  const SuppressedDeltaIcon = suppressedDelta.icon;
  const TotalDeltaIcon = totalDelta.icon;
  const compareHref =
    latestScan && previousComparableScan
      ? `/dashboard/scans/compare?a=${previousComparableScan.id}&b=${latestScan.id}`
      : null;

  const historyHref = `/dashboard/trends?projectId=${id}`;

  return (
    <main className="min-h-screen bg-gray-50 text-slate-900 font-sans">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="text-slate-500 transition hover:text-slate-900"
              title="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-slate-900">{project.name || "Project"}</div>
              {project.repo_url ? (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                  title="Open repository"
                >
                  {project.repo_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <div className="text-xs text-slate-400">
                  No GitHub repository linked yet.{" "}
                  <Link
                    href={`/dashboard/settings?project=${id}`}
                    className="text-slate-500 underline underline-offset-2 hover:text-slate-700"
                  >
                    Add one in settings
                  </Link>{" "}
                  when you want PR integration and repo deep links.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/settings?project=${id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              title="Project settings"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>
        <div className="mt-4 px-6 pb-4">
          <ProjectSectionTabs projectId={id} active="overview" />
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(300px,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Current Health
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {latestScan ? "Start from the latest scan, then compare backward only when you need context." : "No scans yet. This overview becomes useful after the first upload."}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {latestScan ? (
                    <>
                      Latest {latestScan.branch || "default branch"} scan ran {timeAgo(latestScan.created_at)} and is
                      currently <span className="font-semibold text-slate-900">{latestGate.toLowerCase()}</span>.
                      {" "}
                      {latestBlockingNew} blocking new issue{latestBlockingNew === 1 ? "" : "s"} remain, including{" "}
                      {latestCriticalHighBlockers} critical/high blocker{latestCriticalHighBlockers === 1 ? "" : "s"}.
                    </>
                  ) : (
                    <>
                      Upload your first scan, then use this page to review blockers, compare against the prior baseline, and track whether the project is actually getting safer.
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {latestScan ? (
                  <Link
                    href={`/dashboard/scans/${latestScan.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Review blockers
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : null}

                {latestAiFiles > 0 ? (
                  <Link
                    href={`/dashboard/projects/${id}/provenance`}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <Fingerprint className="h-4 w-4" />
                    AI Provenance
                  </Link>
                ) : null}

                {compareHref ? (
                  canCompare ? (
                    <Link
                      href={compareHref}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <GitCompareArrows className="h-4 w-4" />
                      Compare latest vs previous
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/billing"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <GitCompareArrows className="h-4 w-4" />
                      Unlock deep compare
                    </Link>
                  )
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <HealthCard
                label="Latest Gate"
                value={<GateBadge state={latestGate} />}
                meta={
                  latestScan
                    ? `${latestScan.branch || "no branch"} · ${formatTimestamp(latestScan.created_at)}`
                    : "Run your first upload to establish a baseline."
                }
              />
              <HealthCard
                label="Blocking New"
                value={latestBlockingNew}
                meta={`${latestCriticalHighBlockers} critical/high unsuppressed blockers in the latest scan.`}
                sparkline={historyBlocking}
              />
              <HealthCard
                label="Active Suppressions"
                value={activeSuppressions}
                meta={`${latestSuppressed} suppressed findings in the latest scan still count as historical context.`}
              />
              <HealthCard
                label="AI Provenance"
                value={latestAiFiles}
                meta={
                  latestAiFiles > 0
                    ? `${latestScan?.provenance_confidence || "low"} confidence attribution in the latest scan.`
                    : "No AI-attributed files were detected in the latest scan."
                }
              />
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  History
                </div>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">Recent scan rhythm</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Supporting context only. Day-to-day decisions should still start from the latest scan or compare.
                </p>
              </div>

              <Link
                href={historyHref}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Open analytics
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pass rate</div>
                      <div className="mt-2 text-xl font-bold text-slate-900">
                        {recentScans.length ? `${passRateWindow}%` : "No data"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Across the latest {recentScans.length || 0} scan{recentScans.length === 1 ? "" : "s"}.
                      </div>
                    </div>
                    {historyPassRate.length >= 2 ? (
                      <div className="w-28 shrink-0">
                        <MiniSparkline data={historyPassRate} color="#0f172a" />
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">History depth</div>
                      <div className="mt-2 text-lg font-bold text-slate-900">{recentScans.length}</div>
                      <div className="mt-1 text-sm text-slate-500">Scans loaded into this overview.</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Latest finding total</div>
                      <div className="mt-2 text-lg font-bold text-slate-900">{latestTotalFindings}</div>
                      <div className="mt-1 text-sm text-slate-500">Use trends for longer-range history.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                What Changed
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {previousComparableScan
                  ? `Compare the latest ${latestScan?.branch || "project"} scan against the most relevant prior baseline.`
                  : "Run at least two scans before compare becomes useful."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {previousComparableScan
                  ? `Latest scan ${shortCommit(latestScan?.commit_hash)} is being compared to ${shortCommit(previousComparableScan.commit_hash)} on ${previousComparableScan.branch || "the same project"}. Use this section to answer what regressed before opening deeper analytics.`
                  : "This view becomes useful once the project has a previous scan to compare against."}
              </p>
            </div>

            {compareHref ? (
              canCompare ? (
                <Link
                  href={compareHref}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <GitCompareArrows className="h-4 w-4" />
                  Open deep compare
                </Link>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                  Deep compare is still Workspace-gated. Keep this page for the fast summary.
                </div>
              )
            ) : null}
          </div>

          {previousComparableScan ? (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <HealthCard
                  label="Gate Transition"
                  value={
                    <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900">
                      <GateBadge state={previousGate} />
                      <span className="text-slate-400">→</span>
                      <GateBadge state={latestGate} />
                    </div>
                  }
                  meta={
                    previousGate === latestGate
                      ? "No gate-state change between the last two comparable scans."
                      : `Changed from ${previousGate.toLowerCase()} to ${latestGate.toLowerCase()}.`
                  }
                />
                <HealthCard
                  label="Blocking New"
                  value={latestBlockingNew}
                  meta={
                    <span className={blockingDelta.className}>
                      <BlockingDeltaIcon className="mr-1 inline h-3.5 w-3.5" />
                      {blockingDelta.label}
                    </span>
                  }
                />
                <HealthCard
                  label="Introduced"
                  value={newFindings.length}
                  meta={<SeverityBreakout counts={newSeverityCounts} emptyLabel="No new findings were introduced." />}
                />
                <HealthCard
                  label="Resolved"
                  value={resolvedFindings.length}
                  meta={
                    <span className="text-slate-500">
                      {unchangedCount} finding{unchangedCount === 1 ? "" : "s"} stayed unchanged between these scans.
                    </span>
                  }
                />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">New severity mix</div>
                      <div className="mt-3">
                        <SeverityBreakout counts={newSeverityCounts} emptyLabel="No new findings." />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Resolved severity mix</div>
                      <div className="mt-3">
                        <SeverityBreakout counts={resolvedSeverityCounts} emptyLabel="No resolved findings." />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Suppressed</div>
                      <div className="mt-2 text-xl font-bold text-slate-900">{latestSuppressed}</div>
                      <div className={`mt-2 text-sm ${suppressedDelta.className}`}>
                        <SuppressedDeltaIcon className="mr-1 inline h-3.5 w-3.5" />
                        {suppressedDelta.label}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total Findings</div>
                      <div className="mt-2 text-xl font-bold text-slate-900">{latestTotalFindings}</div>
                      <div className={`mt-2 text-sm ${totalDelta.className}`}>
                        <TotalDeltaIcon className="mr-1 inline h-3.5 w-3.5" />
                        {totalDelta.label}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Baseline Scan</div>
                      <div className="mt-2 text-xl font-bold text-slate-900">{shortCommit(previousComparableScan.commit_hash)}</div>
                      <div className="mt-2 text-sm text-slate-500">
                        {previousComparableScan.branch || "no branch"} · {timeAgo(previousComparableScan.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <RuleList
                    title="Top new rule IDs"
                    rows={newRuleLeaders}
                    emptyLabel="No new rule families appeared."
                  />
                  <RuleList
                    title="Top resolved rule IDs"
                    rows={resolvedRuleLeaders}
                    emptyLabel="No rule families were resolved between these scans."
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Upload one more scan for this project, then this section will show gate transition, blocker deltas, and the fastest path into compare.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-6 py-4">
            <div>
              <div className="font-semibold text-slate-900">Recent scans</div>
              <div className="mt-1 text-xs text-slate-500">
                {recentScans.length} shown. Open the latest scan to triage, then compare backward only when you need context.
              </div>
            </div>
            <Link href={historyHref} className="text-sm font-medium text-slate-500 hover:text-slate-900">
              Historical analytics
            </Link>
          </div>

          {recentScans.length === 0 ? (
            <div className="p-8 text-sm text-slate-600">
              No scans yet. Run <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">skylos . --danger --secrets --quality --upload</code> to populate this project overview.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 text-slate-400">
                  <tr>
                    <th className="px-6 py-3 text-left">Time</th>
                    <th className="px-6 py-3 text-left">Branch</th>
                    <th className="px-6 py-3 text-left">Commit</th>
                    <th className="px-6 py-3 text-left">Gate</th>
                    <th className="px-6 py-3 text-right">Blocking New</th>
                    <th className="px-6 py-3 text-right">Suppressed</th>
                    <th className="px-6 py-3 text-right">Security</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((scan) => {
                    const state = gateState(scan);
                    const compareToLatest =
                      canCompare && latestScan && latestScan.id !== scan.id
                        ? `/dashboard/scans/compare?a=${scan.id}&b=${latestScan.id}`
                        : null;

                    return (
                      <tr
                        key={scan.id}
                        className="border-b border-slate-50 transition hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-3 text-slate-700">
                          <div className="font-medium">{timeAgo(scan.created_at)}</div>
                          <div className="text-xs text-slate-400">{formatTimestamp(scan.created_at)}</div>
                        </td>
                        <td className="px-6 py-3 text-slate-700">{scan.branch || "—"}</td>
                        <td className="px-6 py-3 font-mono text-slate-700">{shortCommit(scan.commit_hash)}</td>
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
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/scans/${scan.id}`}
                              className="font-medium text-slate-600 hover:text-slate-900"
                            >
                              View
                            </Link>
                            {countValue(scan.provenance_agent_count) > 0 ? (
                              <Link
                                href={`/dashboard/scans/${scan.id}/provenance`}
                                className="font-medium text-violet-700 hover:text-violet-900"
                              >
                                Provenance
                              </Link>
                            ) : null}
                            {compareToLatest ? (
                              <Link
                                href={compareToLatest}
                                className="font-medium text-slate-500 hover:text-slate-900"
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
        </section>
      </div>
    </main>
  );
}
