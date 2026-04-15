'use client'

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  XCircle,
} from "lucide-react";
import ArtifactStateCard from "@/components/ArtifactStateCard";
import ScanSurfaceHeader from "@/components/ScanSurfaceHeader";

type Scan = {
  id: string;
  project_id: string;
  commit_hash: string;
  branch: string;
  created_at: string;
  tool?: string | null;
  defense_score?: {
    integrations_found?: number;
    files_scanned?: number;
    score_pct: number;
    risk_rating: string;
    weighted_score: number;
    weighted_max: number;
    passed: number;
    total: number;
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
  projects?: { id: string; name: string; repo_url: string };
};

type DefenseFinding = {
  id: string;
  plugin_id: string;
  category: string;
  severity: string;
  weight: number;
  passed: boolean;
  location: string | null;
  message: string | null;
  owasp_llm: string | null;
  remediation: string | null;
};

type DefenseIntegration = {
  id: string;
  provider: string;
  integration_type: string;
  location: string;
  model: string | null;
  tools_count: number;
  input_sources: string[] | null;
  weighted_score: number;
  weighted_max: number;
  score_pct: number;
  risk_rating: string;
};

function formatCompactDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScanFamilyBadge(tool?: string | null) {
  if (!tool || tool === "skylos") return null;
  if (tool === "skylos-defend") {
    return {
      label: "AI Defense",
      className: "bg-sky-100 text-sky-700 border border-sky-200",
    };
  }
  if (tool === "skylos-debt") {
    return {
      label: "Technical Debt",
      className: "bg-amber-100 text-amber-800 border border-amber-200",
    };
  }
  if (tool === "claude-code-security") {
    return {
      label: "Claude Security",
      className: "bg-blue-100 text-blue-700 border border-blue-200",
    };
  }
  return {
    label: tool.toUpperCase(),
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  };
}

function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 90 ? "#10b981" :
    score >= 70 ? "#3b82f6" :
    score >= 40 ? "#f59e0b" :
    "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-900">{score}%</span>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity || "").toUpperCase();
  const styles = {
    CRITICAL: "bg-red-50 text-red-700 ring-red-600/20",
    HIGH: "bg-orange-50 text-orange-700 ring-orange-600/20",
    MEDIUM: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
    LOW: "bg-blue-50 text-blue-700 ring-blue-700/10",
    UNKNOWN: "bg-gray-50 text-gray-700 ring-gray-500/10",
  };
  const activeStyle = styles[s as keyof typeof styles] || styles.UNKNOWN;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ring-1 ring-inset ${activeStyle}`}>
      {s}
    </span>
  );
}

export default function DefenseScanReceiptPage({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [defenseFindings, setDefenseFindings] = useState<DefenseFinding[]>([]);
  const [defenseIntegrations, setDefenseIntegrations] = useState<DefenseIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        const { data: scanData, error: scanError } = await supabase
          .from("scans")
          .select("*, projects(id, name, repo_url)")
          .eq("id", scanId)
          .single();

        if (scanError) {
          throw scanError;
        }

        if (cancelled) return;
        setScan((scanData || null) as Scan | null);

        if (!scanData || !(scanData.tool === "skylos-defend" || scanData.defense_score)) {
          setDefenseFindings([]);
          setDefenseIntegrations([]);
          return;
        }

        const [
          { data: defenseFindingsData, error: defenseFindingsError },
          { data: defenseIntegrationsData, error: defenseIntegrationsError },
        ] = await Promise.all([
          supabase
            .from("defense_findings")
            .select("*")
            .eq("scan_id", scanId)
            .order("passed", { ascending: true }),
          supabase
            .from("defense_integrations")
            .select("*")
            .eq("scan_id", scanId)
            .order("score_pct", { ascending: true }),
        ]);

        if (defenseFindingsError) {
          throw defenseFindingsError;
        }
        if (defenseIntegrationsError) {
          throw defenseIntegrationsError;
        }

        if (cancelled) return;
        setDefenseFindings((defenseFindingsData || []) as DefenseFinding[]);
        setDefenseIntegrations((defenseIntegrationsData || []) as DefenseIntegration[]);
      } catch (fetchError) {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load defense receipt");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [scanId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading defense receipt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-6 lg:p-8">
          <ArtifactStateCard
            title="Failed to load defense receipt"
            message={error}
            tone="error"
            actions={[{ href: "/dashboard/scans", label: "Scan History", tone: "accent" }]}
          />
        </div>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-6 lg:p-8">
          <ArtifactStateCard
            title="Scan not found"
            message="This defense receipt could not be found. Go back to scan history and open another uploaded run."
            actions={[{ href: "/dashboard/scans", label: "Scan History", tone: "accent" }]}
          />
        </div>
      </main>
    );
  }

  const isDefenseScan = scan.tool === "skylos-defend" || !!scan.defense_score;
  const toolBadge = getScanFamilyBadge(scan.tool);

  if (!isDefenseScan) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-6 lg:p-8">
          <ArtifactStateCard
            title="This scan is not an AI Defense receipt"
            message="Open the code scan workbench for triage, or go back to Project Defense for the long-lived dashboard."
            actions={[
              { href: `/dashboard/projects/${scan.project_id}/defense`, label: "Project Defense", tone: "accent" },
              { href: `/dashboard/projects/${scan.project_id}`, label: "Project Overview" },
              { href: "/dashboard/scans", label: "Scan History" },
              { href: `/dashboard/scans/${scan.id}`, label: "Open Scan" },
            ]}
          />
        </div>
      </main>
    );
  }

  const defenseScore = scan.defense_score;
  const failedChecks = defenseFindings.filter((finding) => !finding.passed && finding.category.toLowerCase() === "defense");
  const passedChecks = defenseFindings.filter((finding) => finding.passed && finding.category.toLowerCase() === "defense");
  const opsChecks = defenseFindings.filter((finding) => finding.category.toLowerCase() === "ops");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pointer-events-auto">
      <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-6">
        <ScanSurfaceHeader
          tone="sky"
          breadcrumbLabel="Defense Receipt"
          badgeLabel={toolBadge?.label || "AI Defense Receipt"}
          projectName={scan.projects?.name || "Project"}
          projectHref={scan.projects?.id ? `/dashboard/projects/${scan.projects.id}` : null}
          title="One upload’s AI defense result."
          description="Use this receipt to audit one defense run. Use Project Defense for the project’s latest posture and history."
          metadata={[
            { label: "Branch", value: scan.branch || "unknown" },
            { label: "Commit", value: scan.commit_hash?.slice(0, 7) || "local", mono: true },
            { label: "Uploaded", value: formatCompactDate(scan.created_at) },
          ]}
          actions={[
            ...(scan.projects?.id
              ? [
                  { href: `/dashboard/projects/${scan.projects.id}/defense`, label: "Project Defense", tone: "accent" as const },
                  { href: `/dashboard/projects/${scan.projects.id}`, label: "Project Overview" },
                ]
              : []),
            { href: "/dashboard/scans", label: "Scan History" },
          ]}
        />

        {!defenseScore ? (
          <ArtifactStateCard
            title="Defense summary unavailable"
            message="This upload is tagged as AI Defense, but no summary data was persisted on the scan record."
            actions={[
              ...(scan.projects?.id
                ? [
                    { href: `/dashboard/projects/${scan.projects.id}/defense`, label: "Project Defense", tone: "accent" as const },
                    { href: `/dashboard/projects/${scan.projects.id}`, label: "Project Overview" },
                  ]
                : []),
              { href: "/dashboard/scans", label: "Scan History" },
            ]}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 flex items-center gap-6">
                <ScoreRing score={defenseScore.score_pct} />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Defense Score</div>
                  <div className={`mt-1 text-lg font-black ${
                    defenseScore.score_pct >= 90 ? "text-emerald-600" :
                    defenseScore.score_pct >= 70 ? "text-blue-600" :
                    defenseScore.score_pct >= 40 ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {defenseScore.risk_rating}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {defenseScore.passed}/{defenseScore.total} checks passing · {defenseScore.weighted_score}/{defenseScore.weighted_max} weighted
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ops Score</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{scan.ops_score?.score_pct ?? 0}%</div>
                <div className="mt-1 text-xs font-bold text-slate-600">{scan.ops_score?.rating ?? "UNKNOWN"}</div>
                <div className="mt-1 text-[10px] text-slate-400">
                  {scan.ops_score?.passed ?? 0}/{scan.ops_score?.total ?? 0} ops checks
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Run Context</div>
                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Branch</div>
                    <div className="mt-1 font-mono text-slate-800">{scan.branch || "unknown"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Commit</div>
                    <div className="mt-1 font-mono text-slate-800">{scan.commit_hash?.slice(0, 7) || "local"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Integrations</div>
                    <div className="mt-1 text-slate-800">
                      {defenseScore.integrations_found ?? defenseIntegrations.length} call site{(defenseScore.integrations_found ?? defenseIntegrations.length) === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Files Scanned</div>
                    <div className="mt-1 text-slate-800">{defenseScore.files_scanned ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Detected Integrations</h2>
              </div>
              {defenseIntegrations.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  The defense score was saved, but no per-integration rows are available yet for this scan.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {defenseIntegrations.map((integration) => (
                    <div key={integration.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900">{integration.location}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                            {integration.provider} · {integration.integration_type}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${
                          integration.score_pct >= 90 ? "bg-emerald-100 text-emerald-700" :
                          integration.score_pct >= 70 ? "bg-blue-100 text-blue-700" :
                          integration.score_pct >= 40 ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {integration.score_pct}% {integration.risk_rating}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">Model</div>
                          <div className="mt-1 font-mono text-slate-700">{integration.model || "Unknown"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">Weighted</div>
                          <div className="mt-1 font-mono text-slate-700">{integration.weighted_score}/{integration.weighted_max}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">Tools</div>
                          <div className="mt-1 text-slate-700">{integration.tools_count}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">Inputs</div>
                          <div className="mt-1 text-slate-700">
                            {integration.input_sources && integration.input_sources.length > 0
                              ? integration.input_sources.join(", ")
                              : "Not annotated"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {scan.owasp_coverage && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-bold text-slate-900">OWASP LLM Coverage</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                  {Object.entries(scan.owasp_coverage).map(([id, info]) => (
                    <div
                      key={id}
                      className={`rounded-xl border p-3 ${
                        info.status === "covered" ? "border-emerald-200 bg-emerald-50" :
                        info.status === "partial" ? "border-yellow-200 bg-yellow-50" :
                        info.status === "not_applicable" ? "border-slate-200 bg-slate-50" :
                        "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">{id}</div>
                      <div className="mt-1 text-[11px] font-medium text-slate-600">{info.name}</div>
                      {info.coverage_pct !== null && (
                        <div className="mt-2 text-[10px] text-slate-500">
                          {info.passed}/{info.total} checks · {info.coverage_pct}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <h2 className="text-sm font-bold text-slate-900">Missing Defenses</h2>
                  <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                    {failedChecks.length}
                  </span>
                </div>
                {failedChecks.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">All defense checks passed for this upload.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {failedChecks.map((finding) => (
                      <div key={finding.id} className="rounded-xl border border-red-100 bg-red-50 p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{finding.plugin_id}</span>
                          <SeverityBadge severity={finding.severity} />
                          {finding.owasp_llm && (
                            <span className="text-[10px] font-mono text-slate-400">{finding.owasp_llm}</span>
                          )}
                          <span className="ml-auto text-[10px] font-bold text-red-600">-{finding.weight}</span>
                        </div>
                        {finding.message && <p className="mt-1 text-xs text-slate-700">{finding.message}</p>}
                        {finding.location && <p className="mt-1 text-[10px] font-mono text-slate-500">{finding.location}</p>}
                        {finding.remediation && <p className="mt-2 text-[11px] text-slate-600">Fix: {finding.remediation}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-bold text-slate-900">Passing Checks</h2>
                  <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">
                    {passedChecks.length}
                  </span>
                </div>
                {passedChecks.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No passing defense checks were recorded for this upload.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {passedChecks.map((finding) => (
                      <div key={finding.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{finding.plugin_id}</span>
                          <SeverityBadge severity={finding.severity} />
                          <span className="ml-auto text-[10px] font-bold text-emerald-600">+{finding.weight}</span>
                        </div>
                        {finding.message && <p className="mt-1 text-xs text-slate-700">{finding.message}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {opsChecks.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-bold text-slate-900">Ops Checks</h2>
                <p className="mt-1 text-xs text-slate-500">Operational guardrails. These do not change the defense score or CI gate directly.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {opsChecks.map((finding) => (
                    <div
                      key={finding.id}
                      className={`rounded-xl border p-3 ${
                        finding.passed
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {finding.passed ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="text-xs font-bold text-slate-900">{finding.plugin_id}</span>
                      </div>
                      {finding.message && <p className="mt-2 text-[11px] text-slate-600">{finding.message}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
