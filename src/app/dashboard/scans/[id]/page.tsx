'use client'

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CheckCircle, XCircle, FileText, ChevronRight, ChevronDown,
  Search, ExternalLink, AlertTriangle, Lock, Unlock, Ban, Shield, Terminal, X, ChevronUp, History,
  Share2, Link2, Check, Fingerprint, Layers,
  Download,
} from "lucide-react";
import FlowVisualizerButton from "@/components/FlowVisualizerButton";
import FixPrButton from "@/components/FixPrButton";
import ProFeatureLock from "@/components/ProFeatureLock";
import ProvenanceDetail from "@/components/ProvenanceDetail";

type Scan = {
  id: string;
  commit_hash: string;
  branch: string;
  created_at: string;
  quality_gate_passed: boolean;
  is_overridden: boolean;
  override_reason?: string | null;
  analysis_mode?: "static" | "hybrid" | "agent";
  tool?: string | null;
  ai_code_detected?: boolean;
  ai_code_stats?: {
    detected?: boolean;
    indicators?: { type: string; commit: string; detail: string }[];
    ai_files?: string[];
    confidence?: "high" | "medium" | "low";
    gate_passed?: boolean;
    ai_findings_count?: number;
  } | null;
  defense_score?: {
    score_pct: number;
    risk_rating: string;
    weighted_score: number;
    weighted_max: number;
    passed: number;
    total: number;
    by_severity: Record<string, { passed: number; failed: number; weight: number }>;
  } | null;
  ops_score?: {
    passed: number;
    total: number;
    score_pct: number;
    rating: string;
  } | null;
  owasp_coverage?: Record<string, {
    name: string;
    status: string;
    coverage_pct: number | null;
    passed: number;
    total: number;
    plugins: string[];
  }> | null;
  stats: {
    danger_count?: number;
    new_issues?: number;
    legacy_issues?: number;
    suppressed_new_issues?: number;
    gate?: {
      enabled?: boolean;
      mode?: "zero-new" | "category" | "severity" | "both";
      comparison_scope?: "pr-diff" | "baseline" | "first-scan-baseline";
      thresholds?: {
        by_category?: Record<string, number>;
        by_severity?: Record<string, number>;
      };
      unsuppressed_new_by_category?: Record<string, number>;
      unsuppressed_new_by_severity?: Record<string, number>;
      baseline?: {
        scan_id?: string | null;
        branch?: string | null;
        commit_hash?: string | null;
        created_at?: string | null;
        source?: "same-branch-pass" | "default-branch-pass" | "none" | null;
      };
    };
  };
  projects?: { id: string; name: string; repo_url: string };
  provenance_summary?: {
    total_files: number;
    agent_count: number;
    human_count: number;
    agents_seen: string[];
  } | null;
  provenance_agent_count?: number;
  provenance_confidence?: string | null;
  share_token?: string | null;
  is_public?: boolean;
};

type Finding = {
  id: string;
  category: 'SECURITY' | 'QUALITY' | 'DEAD_CODE' | 'SECRET' | 'DEPENDENCY';
  severity: string;
  message: string;
  file_path: string;
  line_number: number;
  group_id?: string | null;
  rule_id: string;
  snippet?: string | null;
  is_new: boolean;
  new_reason?: "pr-changed-line" | "pr-file-fallback" | "legacy" | "non-pr" | "first-scan-baseline" | "not-in-baseline" | null;
  is_suppressed: boolean;

  finding_id?: string | null;
  verification_verdict?: "VERIFIED" | "REFUTED" | "UNKNOWN" | null;
  verification_reason?: string | null;
  verification_evidence?: {
    chain?: Array<{ fn?: string | null }>;
  } | null;
  verified_at?: string | null;

  analysis_source?: "static" | "llm" | "static+llm" | null;
  analysis_confidence?: "high" | "medium" | "low" | null;
  llm_verdict?: "TRUE_POSITIVE" | "FALSE_POSITIVE" | "UNCERTAIN" | null;
  llm_rationale?: string | null;
  llm_challenged?: boolean;
  needs_review?: boolean;

  source?: string | null;
  source_metadata?: {
    confidence_score?: number;
    exploit_scenario?: string;
    suggested_fix?: string;
    cwe?: string;
  } | null;

  sca_metadata?: {
    vuln_id?: string;
    display_id?: string;
    aliases?: string[];
    affected_range?: string;
    fixed_version?: string | null;
    cvss_score?: number | null;
    references?: string[];
    ecosystem?: string;
    package_name?: string;
    package_version?: string;
  } | null;

  author_email?: string | null;
};

type TabButtonProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function generateGitHubUrl(repoUrl: string, sha: string, filePath: string, line: number) {
  if (!repoUrl || !sha || sha === 'local') return '#';
  const clean = repoUrl.replace(/\/$/, '').replace('.git', '');
  return `${clean}/blob/${sha}/${filePath}#L${line}`;
}

function VerifyBadge({ verdict }: { verdict?: string | null }) {
  const v = String(verdict || "").toUpperCase();
  if (v === "VERIFIED") {
    return <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">VERIFIED</span>;
  }
  if (v === "REFUTED") {
    return <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-bold">REFUTED</span>;
  }
  if (v === "UNKNOWN") {
    return <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[9px] font-bold">UNKNOWN</span>;
  }
  return null;
}

function SourceBadge({ source }: { source?: string | null }) {
  if (!source || source === "static") 
    return null;
  if (source === "static+llm") {
    return <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">STATIC+LLM</span>;
  }
  if (source === "llm") {
    return <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold">LLM</span>;
  }
  return null;
}

function ConfidenceBadge({ confidence }: { confidence?: string | null }) {
  if (!confidence) return null;
  const styles: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-red-100 text-red-700",
  };
  const style = styles[confidence] || styles.medium;
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${style}`}>{confidence.toUpperCase()}</span>;
}


function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity || '').toUpperCase();
  const styles = {
    CRITICAL: "bg-red-50 text-red-700 ring-red-600/20",
    HIGH: "bg-orange-50 text-orange-700 ring-orange-600/20",
    MEDIUM: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
    LOW: "bg-blue-50 text-blue-700 ring-blue-700/10",
    UNKNOWN: "bg-gray-50 text-gray-700 ring-gray-500/10"
  };
  const activeStyle = styles[s as keyof typeof styles] || styles.UNKNOWN;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ring-1 ring-inset ${activeStyle}`}>
      {s}
    </span>
  );
}

function TabButton({ active, onClick, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out rounded-md flex items-center gap-2.5
        ${active 
          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
          : 'bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'}
      `}
    >
      {label}
      <span className={`
        flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] rounded-full font-bold
        ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}
      `}>
        {count}
      </span>
    </button>
  );
}

type GateStatus = "PASS" | "FAIL" | "OVERRIDDEN";
type GateSummary = {
  gateBlockers: Finding[];
  newNonBlocking: Finding[];
  suppressedPresent: Finding[];
  notNew: Finding[];
  aiGateBlockers: Finding[];
  blockerSeverityCounts: Record<string, number>;
  byCategory: Array<{
    cat: string;
    gateBlockers: number;
    newNonBlocking: number;
    suppressedPresent: number;
    notNew: number;
  }>;
};

function rankSeverity(sev: string) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") 
    return 0;
  if (s === "HIGH") 
    return 1;
  if (s === "MEDIUM") 
    return 2;
  return 3;
}

function getGateStatus(scan: Scan): GateStatus {
  if (scan.is_overridden) return "OVERRIDDEN";
  return scan.quality_gate_passed ? "PASS" : "FAIL";
}

function safeNum(x: unknown, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function formatGateMode(mode: string) {
  if (mode === "severity") return "severity thresholds";
  if (mode === "category") return "category thresholds";
  if (mode === "both") return "saved thresholds";
  return "zero-new policy";
}

function formatScanTimestamp(dateString?: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getNotNewFindingPresentation(finding: Finding) {
  if (finding.new_reason === "first-scan-baseline") {
    return {
      badgeLabel: "BASELINE",
      badgeClassName: "bg-sky-100 text-sky-700",
      title: "Baseline Finding",
      description:
        "This scan had no earlier passing baseline, so this finding is recorded as part of the baseline for future comparisons.",
    };
  }

  return {
    badgeLabel: "NOT NEW",
    badgeClassName: "bg-slate-100 text-slate-600",
    title: "Not New In This Scan",
    description:
      "This finding is outside the current new-finding scope, so it remains visible but does not count against the gate.",
  };
}

function buildGateSummary(scan: Scan, findings: Finding[]): GateSummary {
  const gateMeta = scan.stats?.gate;
  const enabled = gateMeta?.enabled !== false;
  const mode = String(gateMeta?.mode || "zero-new");
  const thresholdsByCategory = gateMeta?.thresholds?.by_category || {};
  const thresholdsBySeverity = gateMeta?.thresholds?.by_severity || {};
  const aiFiles = new Set(scan.ai_code_stats?.ai_files || []);

  const unsuppressed = findings.filter((f) => !f.is_suppressed);
  const newUnsuppressed = unsuppressed.filter((f) => f.is_new);
  const blockerIds = new Set<string>();

  if (!scan.is_overridden) {
    if (enabled) {
      const criticalSecurity = unsuppressed.filter(
        (f) =>
          String(f.severity || "").toUpperCase() === "CRITICAL" &&
          String(f.category || "").toUpperCase() === "SECURITY"
      );

      for (const finding of criticalSecurity) {
        blockerIds.add(finding.id);
      }

      if (criticalSecurity.length === 0) {
        if (mode === "zero-new") {
          for (const finding of newUnsuppressed) {
            blockerIds.add(finding.id);
          }
        } else {
          if (mode === "severity" || mode === "both") {
            const bySeverity = newUnsuppressed.reduce<Record<string, number>>((acc, finding) => {
              const key = String(finding.severity || "MEDIUM").toUpperCase();
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {});

            for (const [severity, count] of Object.entries(bySeverity)) {
              if (count <= safeNum(thresholdsBySeverity[severity], 0)) continue;
              for (const finding of newUnsuppressed) {
                if (String(finding.severity || "MEDIUM").toUpperCase() === severity) {
                  blockerIds.add(finding.id);
                }
              }
            }
          }

          if (mode === "category" || mode === "both") {
            const byCategory = newUnsuppressed.reduce<Record<string, number>>((acc, finding) => {
              const key = String(finding.category || "UNCATEGORIZED").toUpperCase();
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {});

            for (const [category, count] of Object.entries(byCategory)) {
              if (count <= safeNum(thresholdsByCategory[category], 0)) continue;
              for (const finding of newUnsuppressed) {
                if (String(finding.category || "UNCATEGORIZED").toUpperCase() === category) {
                  blockerIds.add(finding.id);
                }
              }
            }
          }
        }
      }
    }

    if (scan.ai_code_detected && scan.ai_code_stats?.gate_passed === false) {
      for (const finding of newUnsuppressed) {
        if (aiFiles.has(finding.file_path)) {
          blockerIds.add(finding.id);
        }
      }
    }
  }

  const gateBlockers = findings.filter((f) => blockerIds.has(f.id));
  const newNonBlocking = findings.filter(
    (f) => f.is_new && !f.is_suppressed && !blockerIds.has(f.id)
  );
  const suppressedPresent = findings.filter((f) => f.is_suppressed);
  const notNew = findings.filter(
    (f) => !f.is_new && !f.is_suppressed && !blockerIds.has(f.id)
  );
  const aiGateBlockers = gateBlockers.filter((f) => f.is_new && aiFiles.has(f.file_path));

  const blockerSeverityCounts = gateBlockers.reduce<Record<string, number>>((acc, finding) => {
    const key = String(finding.severity || "LOW").toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const categories = ["SECURITY", "SECRET", "QUALITY", "DEAD_CODE", "DEPENDENCY"] as const;
  const byCategory = categories
    .map((cat) => ({
      cat,
      gateBlockers: gateBlockers.filter((f) => f.category === cat).length,
      newNonBlocking: newNonBlocking.filter((f) => f.category === cat).length,
      suppressedPresent: suppressedPresent.filter((f) => f.category === cat).length,
      notNew: notNew.filter((f) => f.category === cat).length,
    }))
    .filter((row) => row.gateBlockers + row.newNonBlocking + row.suppressedPresent + row.notNew > 0);

  return {
    gateBlockers,
    newNonBlocking,
    suppressedPresent,
    notNew,
    aiGateBlockers,
    blockerSeverityCounts,
    byCategory,
  };
}

function GatePanel({
  scan,
  gateSummary,
  onJumpToFinding,
  isExpanded,
  onToggle,
}: {
  scan: Scan;
  gateSummary: GateSummary;
  onJumpToFinding: (f: Finding) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const status = getGateStatus(scan);
  const gateMeta = scan.stats?.gate;
  const mode = String(gateMeta?.mode || "zero-new");
  const baseline = gateMeta?.baseline;
  const comparisonScope =
    gateMeta?.comparison_scope || (baseline?.scan_id ? "baseline" : "first-scan-baseline");
  const topBlockers = [...gateSummary.gateBlockers]
    .sort((a, b) => rankSeverity(a.severity) - rankSeverity(b.severity))
    .slice(0, 3);
  const criticalGateBlockers = gateSummary.gateBlockers.filter(
    (finding) =>
      String(finding.severity || "").toUpperCase() === "CRITICAL" &&
      String(finding.category || "").toUpperCase() === "SECURITY"
  ).length;

  const statusColors = {
    PASS: "border-emerald-200 bg-emerald-50",
    FAIL: "border-red-200 bg-red-50",
    OVERRIDDEN: "border-amber-200 bg-amber-50",
  };

  const statusTextColors = {
    PASS: "text-emerald-700",
    FAIL: "text-red-700",
    OVERRIDDEN: "text-amber-700",
  };

  return (
    <div className={`border-b border-slate-200 bg-white transition-all ${statusColors[status]}`}>
      <button
        onClick={onToggle}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 font-bold text-sm ${statusTextColors[status]}`}>
            {status === "PASS" && <CheckCircle className="w-4 h-4" />}
            {status === "FAIL" && <XCircle className="w-4 h-4" />}
            {status === "OVERRIDDEN" && <Unlock className="w-4 h-4" />}
            Quality Gate: {status}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="px-2 py-1 rounded bg-white/80 border border-slate-200">
              <span className="font-semibold text-red-600">{gateSummary.gateBlockers.length}</span> gate blockers
            </span>
            <span className="px-2 py-1 rounded bg-white/80 border border-slate-200">
              <span className="font-semibold text-amber-700">{gateSummary.newNonBlocking.length}</span> new non-blocking
            </span>
            <span className="px-2 py-1 rounded bg-white/80 border border-slate-200">
              <span className="font-semibold">{gateSummary.suppressedPresent.length}</span> suppressed present
            </span>
            <span className="px-2 py-1 rounded bg-white/80 border border-slate-200">
              <span className="font-semibold text-slate-500">{gateSummary.notNew.length}</span> not new
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{isExpanded ? "Hide details" : "Show details"}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-4 border-t border-slate-200/50 pt-4 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Compared against</div>
            {comparisonScope === "pr-diff" ? (
              <div className="space-y-1.5">
                <div className="text-sm text-slate-700">
                  This scan uses PR diff scope to decide what counts as new, based on changed lines and files in the current review.
                </div>
                {baseline?.scan_id ? (
                  <>
                    <div className="text-xs text-slate-500">
                      The latest passing baseline on <span className="font-semibold text-slate-700">{baseline.branch || scan.branch}</span> is kept for context, but it does not decide the new/not new classification on this PR-scoped scan.
                    </div>
                    <Link
                      href={`/dashboard/scans/${baseline.scan_id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800"
                    >
                      Open baseline scan
                    </Link>
                  </>
                ) : null}
              </div>
            ) : baseline?.scan_id ? (
              <div className="space-y-1.5">
                <div className="text-sm text-slate-700">
                  Using the latest passing baseline on
                  {" "}
                  <span className="font-semibold text-slate-900">{baseline.branch || scan.branch}</span>
                  {baseline.commit_hash ? (
                    <>
                      {" "}
                      at
                      {" "}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                        {baseline.commit_hash.slice(0, 7)}
                      </code>
                    </>
                  ) : null}
                  {formatScanTimestamp(baseline.created_at) ? (
                    <>
                      {" "}
                      from
                      {" "}
                      <span className="text-slate-500">{formatScanTimestamp(baseline.created_at)}</span>
                    </>
                  ) : null}
                  .
                </div>
                <div className="text-xs text-slate-500">
                  Matching findings from that scan often move into the not new bucket on repeat reruns, even when the code has not changed.
                </div>
                <Link
                  href={`/dashboard/scans/${baseline.scan_id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800"
                >
                  Open baseline scan
                </Link>
              </div>
            ) : (
              <div className="text-sm text-slate-700">
                This scan had no earlier passing baseline, so its findings establish the baseline for future comparisons.
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Blocking reason */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Why</div>
              {status === "PASS" && (
                <div className="space-y-2 text-sm text-slate-700">
                  {gateSummary.gateBlockers.length === 0 && gateSummary.newNonBlocking.length === 0 && gateSummary.notNew.length === 0 ? (
                    <div>No gate blockers or non-new findings in this scan.</div>
                  ) : null}
                  {gateSummary.newNonBlocking.length > 0 ? (
                    <div>
                      {gateSummary.newNonBlocking.length} new finding{gateSummary.newNonBlocking.length !== 1 ? "s" : ""} present, but they stay within the saved {formatGateMode(mode)}.
                    </div>
                  ) : null}
                  {gateSummary.suppressedPresent.length > 0 ? (
                    <div>
                      {gateSummary.suppressedPresent.length} suppressed finding{gateSummary.suppressedPresent.length !== 1 ? "s are" : " is"} still present in this scan but ignored by the gate.
                    </div>
                  ) : null}
                  {gateSummary.notNew.length > 0 ? (
                    <div>
                      {gateSummary.notNew.length} finding{gateSummary.notNew.length !== 1 ? "s are" : " is"} not counted as new in this scan.
                    </div>
                  ) : null}
                </div>
              )}
              {status === "OVERRIDDEN" && (
                <div className="text-sm text-slate-700">
                  Gate overridden.
                  {scan.override_reason && (
                    <span className="block mt-1 text-xs text-slate-500">Reason: {scan.override_reason}</span>
                  )}
                </div>
              )}
              {status === "FAIL" && (
                <div className="space-y-2">
                  <div className="text-sm text-slate-700 font-medium">
                    {criticalGateBlockers > 0
                      ? `${criticalGateBlockers} critical security issue${criticalGateBlockers !== 1 ? "s" : ""} block the gate regardless of thresholds.`
                      : gateSummary.aiGateBlockers.length > 0
                      ? `${gateSummary.aiGateBlockers.length} finding${gateSummary.aiGateBlockers.length !== 1 ? "s" : ""} in AI-authored files block the AI assurance gate.`
                      : mode === "zero-new"
                      ? `${gateSummary.gateBlockers.length} new unsuppressed finding${gateSummary.gateBlockers.length !== 1 ? "s" : ""} block the zero-new policy.`
                      : `${gateSummary.gateBlockers.length} finding${gateSummary.gateBlockers.length !== 1 ? "s" : ""} exceed the saved ${formatGateMode(mode)}.`}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(gateSummary.blockerSeverityCounts)
                    .sort((a, b) => rankSeverity(a) - rankSeverity(b))
                    .map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-slate-100 text-xs font-semibold text-slate-700">
                        {k}: {gateSummary.blockerSeverityCounts[k]}
                      </span>
                    ))}
                  </div>
                  {gateSummary.newNonBlocking.length > 0 ? (
                    <div className="text-xs text-slate-500">
                      {gateSummary.newNonBlocking.length} additional new finding{gateSummary.newNonBlocking.length !== 1 ? "s are" : " is"} present but not contributing to the gate failure.
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Top blockers */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Gate blockers</div>
              {topBlockers.length === 0 ? (
                <div className="text-sm text-slate-500">None in this scan.</div>
              ) : (
                <div className="space-y-1.5">
                  {topBlockers.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onJumpToFinding(f)}
                      className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-slate-50 transition text-xs"
                    >
                      <SeverityBadge severity={f.severity} />
                      <span className="font-mono text-slate-600 truncate">{f.rule_id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Breakdown */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">By category</div>
              {gateSummary.byCategory.length === 0 ? (
                <div className="text-sm text-slate-500">No findings.</div>
              ) : (
                <div className="space-y-2">
                  {gateSummary.byCategory.map((row) => (
                    <div key={row.cat} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="text-xs font-semibold text-slate-800">{row.cat}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Gate blockers {row.gateBlockers} • New non-blocking {row.newNonBlocking} • Suppressed present {row.suppressedPresent} • Not new {row.notNew}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function ScanDetailsPage() {
  const { id } = useParams() as { id: string };

  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string>('free');

  const [viewMode, setViewMode] = useState<'NEW' | 'ALL'>('NEW');
  const [activeTab, setActiveTab] = useState<'ALL' | 'SECURITY' | 'QUALITY' | 'DEAD_CODE' | 'DEPENDENCY' | 'REVIEW'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [showAiOnly, setShowAiOnly] = useState(false);
  const [provenanceFiles, setProvenanceFiles] = useState<string[]>([]);

  const [isOverriding, setIsOverriding] = useState(false);
  const [isSuppressing, setIsSuppressing] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("Manual Override");

  const [suppressOpen, setSuppressOpen] = useState(false);
  const [suppressReason, setSuppressReason] = useState("False Positive");
  const [suppressExpiry, setSuppressExpiry] = useState<'NEVER' | '7' | '30' | '90'>('NEVER');

  // Gate panel collapsed by default
  const [gatePanelExpanded, setGatePanelExpanded] = useState(false);

  // Share state
  const [shareLoading, setShareLoading] = useState(false);
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [exportPopoverOpen, setExportPopoverOpen] = useState(false);

  const addDaysIso = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  const shareUrl = scan?.share_token ? `https://skylos.dev/scan/${scan.share_token}` : null;

  const handleShare = async () => {
    if (!scan) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/scans/${scan.id}/share`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.share_token) {
        setScan({ ...scan, share_token: data.share_token, is_public: true });
        setSharePopoverOpen(true);
      } else {
        setToast({ type: "error", message: data.error || "Failed to share" });
      }
    } catch {
      setToast({ type: "error", message: "Failed to share scan" });
    } finally {
      setShareLoading(false);
    }
  };

  const handleUnshare = async () => {
    if (!scan) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/scans/${scan.id}/share`, { method: "DELETE" });
      if (res.ok) {
        setScan({ ...scan, share_token: null, is_public: false });
        setSharePopoverOpen(false);
        setToast({ type: "success", message: "Scan unshared" });
      }
    } catch {
      setToast({ type: "error", message: "Failed to unshare" });
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const canExport = userPlan === "pro" || userPlan === "enterprise";

  const handleExport = (format: "json" | "csv") => {
    if (!canExport) {
      setToast({
        type: "error",
        message: "Findings export is a Pro feature. Buy any credit pack at skylos.dev/dashboard/billing to unlock.",
      });
      setExportPopoverOpen(false);
      return;
    }

    window.open(`/api/scans/${scan?.id}/export?format=${format}`, "_blank");
    setExportPopoverOpen(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: scanData } = await supabase
      .from("scans")
      .select("*, share_token, is_public, projects(id, name, repo_url)")
      .eq("id", id)
      .single();

    if (scanData) {
      setScan(scanData as Scan);
      if (scanData.quality_gate_passed) setViewMode('ALL');
    }

    const { data: findingsData } = await supabase
      .from("findings")
      .select("*")
      .eq("scan_id", id)
      .order("severity");

    if (findingsData) {
      setFindings(findingsData as Finding[]);
    }

    // Fetch provenance files for AI-authored filter
    const { data: provFiles } = await supabase
      .from("provenance_files")
      .select("file_path")
      .eq("scan_id", id)
      .eq("agent_authored", true);

    if (provFiles) {
      setProvenanceFiles(provFiles.map((f: { file_path: string }) => f.file_path));
    }

    // Fetch plan for gating
    try {
      const balanceRes = await fetch('/api/credits/balance');
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setUserPlan(balanceData.plan || 'free');
      }
    } catch {}

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOverride = () => {
    setOverrideReason("Manual Override");
    setOverrideOpen(true);
  };

  const submitOverride = async () => {
    const reason = overrideReason.trim();
    if (!reason) return;

    setIsOverriding(true);
    try {
      const res = await fetch(`/api/scans/${id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Server rejected override");
      }

      setOverrideOpen(false);
      await fetchData();
      setToast({ type: 'success', message: "Override applied. Gate marked as passed." });
    } catch (error: unknown) {
      setToast({ type: 'error', message: `Override failed: ${getErrorMessage(error, "Unknown error")}` });
    } finally {
      setIsOverriding(false);
    }
  };

  const handleSuppress = () => {
    if (!selectedFinding) return;
    setSuppressReason("False Positive");
    setSuppressExpiry('NEVER');
    setSuppressOpen(true);
  };

  const submitSuppress = async () => {
    if (!selectedFinding) return;

    const reasonText = suppressReason.trim();
    if (!reasonText) return;

    const expires_at = suppressExpiry === 'NEVER' ? null : addDaysIso(parseInt(suppressExpiry, 10));

    setIsSuppressing(true);
    try {
      const res = await fetch(`/api/findings/${selectedFinding.id}/suppress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasonText, expires_at })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Server rejected suppression");
      }

      setSuppressOpen(false);
      await fetchData();
      setToast({ type: 'success', message: "Suppressed. Future scans will ignore this signature." });
    } catch (error: unknown) {
      setToast({ type: 'error', message: `Suppress failed: ${getErrorMessage(error, "Unknown error")}` });
    } finally {
      setIsSuppressing(false);
    }
  };

  const viewFindings = useMemo(() => {
    return findings.filter(f => {
      if (viewMode === 'NEW') return f.is_new && !f.is_suppressed;
      return true;
    });
  }, [findings, viewMode]);

  const filteredFindings = useMemo(() => {
    return viewFindings.filter(f => {
      if (activeTab === 'REVIEW') {
        if (!f.needs_review) return false;
      } else if (activeTab !== 'ALL') {
        if (activeTab === 'SECURITY') {
          if (f.category !== 'SECURITY' && f.category !== 'SECRET') return false;
        } else if (f.category !== activeTab) {
          return false;
        }
      }
      if (search) {
        const term = search.toLowerCase();
        if (!f.message.toLowerCase().includes(term) && !f.file_path.toLowerCase().includes(term)) {
          return false;
        }
      }
      if (showAiOnly && provenanceFiles.length > 0) {
        if (!provenanceFiles.includes(f.file_path)) return false;
      }
      return true;
    });
  }, [viewFindings, activeTab, search, showAiOnly, provenanceFiles]);

  useEffect(() => {
    if (filteredFindings.length > 0 && !selectedFinding) {
      setSelectedFinding(filteredFindings[0]);
    }
    if (selectedFinding && !filteredFindings.find(f => f.id === selectedFinding.id) && filteredFindings.length > 0) {
      setSelectedFinding(filteredFindings[0]);
    }
  }, [filteredFindings, selectedFinding]);

  const groupedFindings = useMemo(() => {
    const grouped: Record<string, Finding[]> = {};
    filteredFindings.forEach(f => {
      if (!grouped[f.file_path]) grouped[f.file_path] = [];
      grouped[f.file_path].push(f);
    });
    return grouped;
  }, [filteredFindings]);

  const groupedFindingKeys = useMemo(
    () => Object.keys(groupedFindings).join('|'),
    [groupedFindings]
  );

  useEffect(() => {
    const uniqueFiles = Object.keys(groupedFindings);
    const expandState: Record<string, boolean> = {};
    uniqueFiles.forEach(f => (expandState[f] = true));
    if (Object.keys(expandedFiles).length === 0) setExpandedFiles(expandState);
  }, [expandedFiles, groupedFindingKeys, groupedFindings]);

  const counts = useMemo(() => ({
    ALL: viewFindings.length,
    SECURITY: viewFindings.filter(f => f.category === 'SECURITY' || f.category === 'SECRET').length,
    QUALITY: viewFindings.filter(f => f.category === 'QUALITY').length,
    DEAD_CODE: viewFindings.filter(f => f.category === 'DEAD_CODE').length,
    DEPENDENCY: viewFindings.filter(f => f.category === 'DEPENDENCY').length,
    REVIEW: viewFindings.filter(f => f.needs_review).length,
  }), [viewFindings]);
  const gateSummary = useMemo(() => (scan ? buildGateSummary(scan, findings) : null), [scan, findings]);
  const verificationChain = selectedFinding?.verification_evidence?.chain ?? [];

  const toggleFile = (filePath: string) => {
    setExpandedFiles(prev => ({ ...prev, [filePath]: !prev[filePath] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Loading Analysis...</p>
        </div>
      </div>
    );
  }

  if (!scan) {
    return <div className="min-h-screen bg-slate-50 text-slate-900 p-8">Scan not found</div>;
  }

  const gateFailed = !scan.quality_gate_passed;
  const effectiveGateSummary = gateSummary || buildGateSummary(scan, findings);
  const selectedFindingIsGateBlocker = !!(
    selectedFinding &&
    effectiveGateSummary.gateBlockers.some((finding) => finding.id === selectedFinding.id)
  );
  const selectedFindingNotNewPresentation =
    selectedFinding && !selectedFinding.is_new && !selectedFinding.is_suppressed
      ? getNotNewFindingPresentation(selectedFinding)
      : null;

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100]">
          <div className={`rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3 max-w-[420px]
            ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            <div className="text-sm font-medium leading-snug">{toast.message}</div>
            <button onClick={() => setToast(null)} className="ml-auto p-1 rounded hover:bg-black/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideOpen && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isOverriding && setOverrideOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">Emergency Override</div>
                  <div className="text-xs text-slate-500 mt-0.5">Marks the gate as passed for this commit.</div>
                </div>
                <button onClick={() => setOverrideOpen(false)} className="ml-auto p-2 rounded-lg hover:bg-slate-50">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Reason</label>
                  <input
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="e.g. Hotfix deploy"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setOverrideOpen(false)} disabled={isOverriding} className="px-3 py-2 rounded-lg text-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                  <button onClick={submitOverride} disabled={isOverriding || !overrideReason.trim()} className="px-3 py-2 rounded-lg text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
                    {isOverriding ? "Applying..." : "Apply Override"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suppress Modal */}
      {suppressOpen && selectedFinding && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isSuppressing && setSuppressOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">Suppress Finding</div>
                  <div className="text-xs text-slate-500 mt-0.5">Persists across future scans.</div>
                </div>
                <button onClick={() => setSuppressOpen(false)} className="ml-auto p-2 rounded-lg hover:bg-slate-50">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 font-mono">
                  {selectedFinding.rule_id} :: {selectedFinding.file_path}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Expiry</label>
                    <select value={suppressExpiry} onChange={(e) => setSuppressExpiry(e.target.value as 'NEVER' | '7' | '30' | '90')} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none">
                      <option value="NEVER">Never</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Reason</label>
                  <textarea value={suppressReason} onChange={(e) => setSuppressReason(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none" placeholder="Why is this safe to ignore?" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setSuppressOpen(false)} disabled={isSuppressing} className="px-3 py-2 rounded-lg text-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                  <button onClick={submitSuppress} disabled={isSuppressing || !suppressReason.trim()} className="px-3 py-2 rounded-lg text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
                    {isSuppressing ? "Saving..." : "Suppress"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER - Compact */}
      <header className="h-14 shrink-0 border-b border-slate-200 bg-white px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link
            href={scan.projects?.id ? `/dashboard/projects/${scan.projects.id}` : "/dashboard/projects"}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Project overview</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="font-semibold text-slate-900">{scan.projects?.name}</span>
            <span className="text-xs text-slate-400 font-mono ml-2">{scan.commit_hash?.slice(0, 7)}</span>
            {scan.analysis_mode && scan.analysis_mode !== "static" && (
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold ml-2">
                {scan.analysis_mode.toUpperCase()} MODE
              </span>
            )}
            {scan.tool && scan.tool !== "skylos" && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ml-2 ${
                scan.tool === "claude-code-security"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {scan.tool === "claude-code-security" ? "Claude Security" : scan.tool.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => {
                setSharePopoverOpen(false);
                if (!canExport) {
                  handleExport("json");
                  return;
                }
                setExportPopoverOpen(!exportPopoverOpen);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <Download className="w-3 h-3" />
              Export
              {!canExport && <Lock className="w-3 h-3" />}
            </button>
            {exportPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-slate-200 shadow-lg p-1 z-50">
                <button
                  onClick={() => handleExport("json")}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Export CSV
                </button>
              </div>
            )}
          </div>

          {/* Share button */}
          <div className="relative">
            <button
              onClick={() => {
                setExportPopoverOpen(false);
                if (scan?.share_token && scan?.is_public) {
                  setSharePopoverOpen(!sharePopoverOpen);
                } else {
                  handleShare();
                }
              }}
              disabled={shareLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <Share2 className="w-3 h-3" />
              {scan?.is_public ? "Shared" : "Share"}
            </button>
            {sharePopoverOpen && shareUrl && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg p-4 z-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Public link</span>
                  <button onClick={handleUnshare} disabled={shareLoading} className="text-[10px] text-red-600 hover:text-red-700 font-medium">
                    Unshare
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 font-mono"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={copyShareUrl}
                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                  >
                    {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Anyone with this link can view this scan report.</p>
              </div>
            )}
          </div>

          {gateFailed && (userPlan === "pro" || userPlan === "enterprise") && (
            <button
              onClick={handleOverride}
              disabled={isOverriding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow disabled:opacity-50"
            >
              <Unlock className="w-3 h-3" />
              Override
            </button>
          )}
        </div>
      </header>

      {/* GATE PANEL - Collapsible */}
      <GatePanel
        scan={scan}
        gateSummary={effectiveGateSummary}
        onJumpToFinding={(f) => {
          setSelectedFinding(f);
          setExpandedFiles(prev => ({ ...prev, [f.file_path]: true }));
          setActiveTab('ALL');
          setViewMode('NEW');
          setSearch('');
          setGatePanelExpanded(false);
        }}
        isExpanded={gatePanelExpanded}
        onToggle={() => setGatePanelExpanded(!gatePanelExpanded)}
      />

      {/* AI Code Assurance Panel */}
      {scan.ai_code_detected && scan.ai_code_stats && (
        <div className="mx-4 mb-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-bold text-purple-900">AI Code Assurance</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                scan.ai_code_stats.gate_passed === true
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : scan.ai_code_stats.gate_passed === false
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-purple-100 text-purple-700 border border-purple-200'
              }`}>
                {scan.ai_code_stats.gate_passed === true ? 'AI ASSURED' :
                 scan.ai_code_stats.gate_passed === false ? 'AI ISSUES FOUND' :
                 'AI CODE DETECTED'}
              </span>
            </div>
            <span className="text-xs text-purple-600">
              {scan.ai_code_stats.confidence} confidence &middot; {scan.ai_code_stats.ai_files?.length || 0} files &middot; {scan.ai_code_stats.indicators?.length || 0} indicators
            </span>
          </div>

          {scan.ai_code_stats.indicators && scan.ai_code_stats.indicators.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {scan.ai_code_stats.indicators.slice(0, 8).map((ind, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-purple-200 text-[10px] text-purple-700">
                  <span className="font-bold">{ind.type}</span>
                  <span className="font-mono text-purple-500">{ind.commit}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

	      {/* AI Provenance Panel */}
	      {scan.provenance_agent_count != null && scan.provenance_agent_count > 0 && scan.provenance_summary && (
        <div className="mx-4 mb-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-bold text-violet-900">AI Provenance</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
                {scan.provenance_agent_count} AI FILES
              </span>
            </div>
            <span className="text-xs text-violet-600">
              {scan.provenance_confidence} confidence &middot; {scan.provenance_summary.agents_seen?.join(', ')}
            </span>
          </div>

          {userPlan === 'free' ? (
            <div className="mt-3">
              <ProFeatureLock
                feature="Per-file AI provenance breakdown"
                description="See which files were AI-authored, by which agent, with exact line ranges"
              />
            </div>
          ) : (
            <ProvenanceDetail scanId={scan.id} />
          )}
        </div>
      )}

      {/* AI Defense Panel */}
      {scan.defense_score && (
        <div className="mx-4 mb-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-bold text-sky-900">AI Defense Score</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                scan.defense_score.score_pct >= 90
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : scan.defense_score.score_pct >= 70
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : scan.defense_score.score_pct >= 40
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                  : 'bg-rose-100 text-rose-700 border border-rose-200'
              }`}>
                {scan.defense_score.score_pct}% {scan.defense_score.risk_rating}
              </span>
            </div>
            <span className="text-xs text-sky-600">
              {scan.defense_score.passed}/{scan.defense_score.total} checks passing &middot; {scan.defense_score.weighted_score}/{scan.defense_score.weighted_max} weighted
            </span>
          </div>

          {/* Severity breakdown */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(scan.defense_score.by_severity).map(([sev, data]) => (
              <span key={sev} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border text-[10px] ${
                data.failed > 0 ? 'border-red-200 text-red-700' : 'border-emerald-200 text-emerald-700'
              }`}>
                <span className="font-bold uppercase">{sev}</span>
                <span>{data.passed}/{data.passed + data.failed}</span>
              </span>
            ))}
          </div>

          {/* Ops score */}
          {scan.ops_score && scan.ops_score.total > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-sky-600 font-semibold">Ops Score:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                scan.ops_score.score_pct >= 80
                  ? 'bg-emerald-100 text-emerald-700'
                  : scan.ops_score.score_pct >= 60
                  ? 'bg-blue-100 text-blue-700'
                  : scan.ops_score.score_pct >= 40
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {scan.ops_score.score_pct}% {scan.ops_score.rating}
              </span>
              <span className="text-[10px] text-sky-500">{scan.ops_score.passed}/{scan.ops_score.total} ops checks</span>
            </div>
          )}

          {/* OWASP Coverage */}
          {scan.owasp_coverage && (
            <div className="mt-2 grid grid-cols-5 gap-1">
              {Object.entries(scan.owasp_coverage).map(([id, info]) => (
                <span key={id} className={`text-center px-1 py-0.5 rounded text-[9px] font-bold ${
                  info.status === 'covered' ? 'bg-emerald-100 text-emerald-700' :
                  info.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                  info.status === 'not_applicable' ? 'bg-slate-100 text-slate-400' :
                  'bg-red-100 text-red-700'
                }`}>
                  {id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIN CONTENT - Takes remaining space */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Findings list */}
        <div className="w-[380px] flex flex-col bg-white border-r border-slate-200">
          <div className="p-3 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Findings</h2>
              <button
                onClick={() => setViewMode(viewMode === 'NEW' ? 'ALL' : 'NEW')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors border bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {viewMode === 'NEW' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {viewMode === 'NEW' ? 'New only' : 'All'}
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <TabButton label="All" active={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')} count={counts.ALL} />
              <TabButton label="Security" active={activeTab === 'SECURITY'} onClick={() => setActiveTab('SECURITY')} count={counts.SECURITY} />
              <TabButton label="Quality" active={activeTab === 'QUALITY'} onClick={() => setActiveTab('QUALITY')} count={counts.QUALITY} />
              <TabButton label="Dead" active={activeTab === 'DEAD_CODE'} onClick={() => setActiveTab('DEAD_CODE')} count={counts.DEAD_CODE} />
              {counts.DEPENDENCY > 0 && (
                <TabButton label="Deps" active={activeTab === 'DEPENDENCY'} onClick={() => setActiveTab('DEPENDENCY')} count={counts.DEPENDENCY} />
              )}
              {counts.REVIEW > 0 && (
                <TabButton label="Review" active={activeTab === 'REVIEW'} onClick={() => setActiveTab('REVIEW')} count={counts.REVIEW} />
              )}
              {provenanceFiles.length > 0 && (
                <button
                  onClick={() => {
                    if (userPlan === 'free') return;
                    setShowAiOnly(!showAiOnly);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                    showAiOnly
                      ? 'bg-violet-100 text-violet-700 border-violet-300'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-violet-50'
                  } ${userPlan === 'free' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={userPlan === 'free' ? 'Pro feature: filter by AI-authored files' : 'Show only AI-authored files'}
                >
                  {userPlan === 'free' && <Lock className="w-2.5 h-2.5 inline mr-0.5" />}
                  <Fingerprint className="w-2.5 h-2.5 inline mr-0.5" />
                  AI
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {Object.keys(groupedFindings).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <CheckCircle className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-500">No findings</p>
              </div>
            ) : (
              <div className="py-1">
                {Object.entries(groupedFindings).map(([file, fileFindings]) => {
                  const isOpen = expandedFiles[file] ?? true;
                  return (
                    <div key={file}>
                      <button onClick={() => toggleFile(file)} className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors">
                        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                        <span className="text-xs font-medium text-slate-600 truncate font-mono">{file}</span>
                        <span className="ml-auto text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{fileFindings.length}</span>
                      </button>

                      {isOpen && (
                        <div className="pl-3 pr-2 space-y-1 pb-1">
                          {fileFindings.map(f => {
                            const active = selectedFinding?.id === f.id;
                            const notNewPresentation =
                              !f.is_new && !f.is_suppressed ? getNotNewFindingPresentation(f) : null;
                            return (
                              <button
                                key={f.id}
                                onClick={() => setSelectedFinding(f)}
                                className={`w-full text-left p-2.5 rounded-lg border transition-all ${active ? 'bg-slate-900 border-slate-900' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${f.severity === 'CRITICAL' ? 'bg-red-500' : f.severity === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                                    <span className={`text-[10px] font-mono ${active ? 'text-slate-400' : 'text-slate-500'}`}>{f.rule_id}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {!!f.verification_verdict && <VerifyBadge verdict={f.verification_verdict} />}

                                    {f.is_new && !f.is_suppressed && (
                                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded">NEW</span>
                                    )}
                                    {f.is_suppressed && (
                                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[9px] font-bold rounded">IGNORED</span>
                                    )}
                                    {notNewPresentation && (
                                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${notNewPresentation.badgeClassName}`}>
                                        {notNewPresentation.badgeLabel}
                                      </span>
                                    )}
                                    {!!f.analysis_source && <SourceBadge source={f.analysis_source} />}
                                    {!!f.analysis_confidence && <ConfidenceBadge confidence={f.analysis_confidence} />}
                                    {f.needs_review && (
                                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded">REVIEW</span>
                                    )}
                                  </div>
                                </div>

                                <p className={`text-xs line-clamp-2 ${active ? 'text-white' : 'text-slate-700'}`}>{f.message}</p>
                                <div className={`mt-1.5 text-[10px] font-mono ${active ? 'text-slate-500' : 'text-slate-400'}`}>
                                  L{f.line_number}
                                  {f.author_email && <span className="ml-2">{f.author_email}</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Detail pane */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {!selectedFinding ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
              <Shield className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm">Select a finding</p>
            </div>
          ) : (
	            <div className="max-w-4xl mx-auto p-6 lg:p-8">
	              {/* Alert banners */}
              {selectedFinding.is_new && !selectedFinding.is_suppressed && selectedFindingIsGateBlocker && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-red-900">Gate Blocker</div>
                    <p className="text-xs text-red-700 mt-0.5">This finding is currently failing the quality gate.</p>
                  </div>
                </div>
              )}

              {selectedFinding.is_new && !selectedFinding.is_suppressed && !selectedFindingIsGateBlocker && (
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-amber-900">New In This Scan</div>
                    <p className="text-xs text-amber-700 mt-0.5">This finding is new, but it stays below the current gate thresholds.</p>
                  </div>
                </div>
              )}

	              {selectedFinding.is_suppressed && (
	                <div className="mb-6 rounded-lg border border-slate-200 bg-white p-3 flex gap-3 opacity-75">
                  <Ban className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-700">Suppressed</div>
                    <p className="text-xs text-slate-500 mt-0.5">Still present in this scan, but ignored by the active suppression.</p>
                  </div>
	                </div>
	              )}

              {!selectedFinding.is_new && !selectedFinding.is_suppressed && !selectedFindingIsGateBlocker && selectedFindingNotNewPresentation && (
                <div className="mb-6 rounded-lg border border-slate-200 bg-white p-3 flex gap-3">
                  <History className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-700">{selectedFindingNotNewPresentation.title}</div>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedFindingNotNewPresentation.description}</p>
                  </div>
                </div>
              )}

	              <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4">
	                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
	                    <div>
	                      <div className="text-xs font-bold uppercase tracking-wide text-sky-700">Scan Occurrence</div>
	                      <p className="mt-1 text-sm text-sky-900">
	                      This page is the workbench for one upload. Use it to clear blockers in this scan.
	                      Recurrence history, ownership, comments, and verification context live in the persistent issue record.
	                    </p>
	                  </div>
	                  {selectedFinding.group_id ? (
	                    <Link
	                      href={`/dashboard/issues/${selectedFinding.group_id}`}
	                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
	                    >
	                      <Layers className="w-3.5 h-3.5" />
	                      Open recurring issue
	                    </Link>
	                  ) : null}
	                </div>
	              </div>

	              <div className="flex items-start justify-between gap-4 mb-4">
	                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityBadge severity={selectedFinding.severity} />
                    <span className="font-mono text-xs text-slate-500 px-2 py-0.5 rounded bg-white border border-slate-200">{selectedFinding.rule_id}</span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">{selectedFinding.message}</h1>
                </div>

                {/* Action buttons - Flow + Suppress */}
                <div className="flex items-center gap-2 shrink-0">
                  <FixPrButton findingId={selectedFinding.id} plan={userPlan} />
                  <FlowVisualizerButton
                    findingId={selectedFinding.id}
                    ruleId={selectedFinding.rule_id}
                    category={selectedFinding.category}
                    repoUrl={scan.projects?.repo_url}
                    commitHash={scan.commit_hash}
                  />
                  
                  {!selectedFinding.is_suppressed && (
                    <button onClick={handleSuppress} disabled={isSuppressing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                      <Ban className="w-3 h-3" />
                      Suppress
                    </button>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white border border-slate-200 text-xs font-mono text-slate-600 mb-6">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {selectedFinding.file_path}
                <span className="text-slate-300">:</span>
                <span className="text-slate-900">{selectedFinding.line_number}</span>
              </div>

              {selectedFinding.verification_verdict && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-900">Verification</div>
                    <VerifyBadge verdict={selectedFinding.verification_verdict} />
                  </div>

                  {selectedFinding.verification_reason && (
                    <div className="mt-2 text-xs text-slate-600">
                      {selectedFinding.verification_reason}
                    </div>
                  )}

                  {verificationChain.length > 0 && (
                    <div className="mt-3 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto">
                      {verificationChain
                        .slice(0, 12)
                        .map((x) => x.fn || "unknown")
                        .join(" → ")}
                    </div>
                  )}
                </div>
              )}

              {/* LLM Analysis (hybrid/agent mode) */}
              {selectedFinding.llm_verdict && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-900">LLM Analysis</div>
                    <div className="flex items-center gap-2">
                      <SourceBadge source={selectedFinding.analysis_source} />
                      <ConfidenceBadge confidence={selectedFinding.analysis_confidence} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-500">Verdict</span>
                      <div className="mt-1 font-mono text-slate-700">{selectedFinding.llm_verdict}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Source</span>
                      <div className="mt-1 font-mono text-slate-700">{selectedFinding.analysis_source}</div>
                    </div>
                  </div>

                  {selectedFinding.llm_rationale && (
                    <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      {selectedFinding.llm_rationale}
                    </div>
                  )}

                  {selectedFinding.llm_challenged && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                      <AlertTriangle className="w-3 h-3" />
                      LLM challenged this finding (may be a false positive)
                    </div>
                  )}
                </div>
              )}

              {/* SCA Vulnerability Detail */}
              {selectedFinding.category === 'DEPENDENCY' && selectedFinding.sca_metadata && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-slate-900">Vulnerability Detail</div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {selectedFinding.sca_metadata.ecosystem || 'Unknown'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                    <div>
                      <span className="font-semibold text-slate-500">CVE / ID</span>
                      <div className="mt-1 font-mono text-slate-900 font-semibold">
                        {selectedFinding.sca_metadata.display_id || selectedFinding.sca_metadata.vuln_id || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Package</span>
                      <div className="mt-1 font-mono text-slate-700">
                        {selectedFinding.sca_metadata.package_name}@{selectedFinding.sca_metadata.package_version}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Affected Range</span>
                      <div className="mt-1 font-mono text-slate-700">
                        {selectedFinding.sca_metadata.affected_range || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Fix Version</span>
                      <div className={`mt-1 font-mono ${selectedFinding.sca_metadata.fixed_version ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        {selectedFinding.sca_metadata.fixed_version || 'No fix available'}
                      </div>
                    </div>
                    {selectedFinding.sca_metadata.cvss_score != null && (
                      <div>
                        <span className="font-semibold text-slate-500">CVSS Score</span>
                        <div className="mt-1 font-mono text-slate-700">{selectedFinding.sca_metadata.cvss_score}</div>
                      </div>
                    )}
                  </div>

                  {selectedFinding.sca_metadata.aliases && selectedFinding.sca_metadata.aliases.length > 0 && (
                    <div className="text-xs mb-3">
                      <span className="font-semibold text-slate-500">Aliases: </span>
                      <span className="font-mono text-slate-600">{selectedFinding.sca_metadata.aliases.join(', ')}</span>
                    </div>
                  )}

                  {selectedFinding.sca_metadata.references && selectedFinding.sca_metadata.references.length > 0 && (
                    <div className="text-xs">
                      <span className="font-semibold text-slate-500 block mb-1">References</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedFinding.sca_metadata.references.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 underline">
                            <ExternalLink className="w-3 h-3" />
                            {new URL(url).hostname}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Claude Code Security Detail */}
              {selectedFinding.source === 'claude-code-security' && selectedFinding.source_metadata && (
                <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-slate-900">Claude Security Analysis</div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Claude Code Security
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                    {selectedFinding.source_metadata.confidence_score != null && (
                      <div>
                        <span className="font-semibold text-slate-500">Confidence Score</span>
                        <div className="mt-1 font-mono text-slate-900 font-semibold">
                          {(selectedFinding.source_metadata.confidence_score * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                    {selectedFinding.source_metadata.cwe && (
                      <div>
                        <span className="font-semibold text-slate-500">CWE</span>
                        <div className="mt-1 font-mono text-slate-700">
                          {selectedFinding.source_metadata.cwe}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedFinding.source_metadata.exploit_scenario && (
                    <div className="text-xs mb-3">
                      <span className="font-semibold text-slate-500 block mb-1">Exploit Scenario</span>
                      <div className="text-slate-700 bg-white/50 rounded-lg p-3 border border-blue-100">
                        {selectedFinding.source_metadata.exploit_scenario}
                      </div>
                    </div>
                  )}

                  {selectedFinding.source_metadata.suggested_fix && (
                    <div className="text-xs">
                      <span className="font-semibold text-slate-500 block mb-1">Suggested Fix</span>
                      <div className="text-slate-700 bg-white/50 rounded-lg p-3 border border-blue-100 font-mono">
                        {selectedFinding.source_metadata.suggested_fix}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Code */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">Source</span>
                  {scan.projects?.repo_url && (
                    <a href={generateGitHubUrl(scan.projects.repo_url, scan.commit_hash, selectedFinding.file_path, selectedFinding.line_number)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition">
                      GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <pre className="p-4 overflow-x-auto text-sm leading-relaxed bg-[#1e1e1e] text-slate-300 font-mono">
                    {selectedFinding.snippet ? (
                      selectedFinding.snippet.split('\n').map((line, i) => {
                        const centerIdx = Math.floor(selectedFinding.snippet!.split('\n').length / 2);
                        const isTargetLine = i === centerIdx;
                        const displayLine = selectedFinding.line_number - centerIdx + i;
                        return (
                          <div key={i} className={`flex ${isTargetLine ? 'bg-red-900/30' : ''}`}>
                            <span className={`w-10 text-right pr-3 select-none shrink-0 ${isTargetLine ? 'text-red-400 font-bold' : 'text-slate-600'}`}>{displayLine}</span>
                            {isTargetLine && <span className="w-1 bg-red-500 shrink-0" />}
                            <span className={`pl-3 ${isTargetLine ? 'text-white' : ''}`}>{line || ' '}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-slate-500 italic">No snippet available.</span>
                    )}
                  </pre>
                </div>
              </div>

              {/* Fix suggestion */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-500" />
                  Fix with CLI
                </h3>
                <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300">
                  skylos {selectedFinding.file_path} --fix
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
