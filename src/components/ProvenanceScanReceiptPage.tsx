import Link from "next/link";
import { GitCommit, GitBranch, Shield, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import ArtifactReceiptHeader from "@/components/ArtifactReceiptHeader";
import ArtifactStateCard from "@/components/ArtifactStateCard";
import ProFeatureLock from "@/components/ProFeatureLock";
import ProvenanceDetail from "@/components/ProvenanceDetail";
import ScrollToTopOnMount from "@/components/ScrollToTopOnMount";
import { canUseProvenanceAudit, canViewProvenanceDetail, getEffectivePlan } from "@/lib/entitlements";

type AiCodeIndicator = {
  type: string;
  commit: string;
  detail: string;
};

type AiCodeStats = {
  detected?: boolean;
  indicators?: AiCodeIndicator[];
  ai_files?: string[];
  confidence?: "high" | "medium" | "low";
  gate_passed?: boolean;
  ai_findings_count?: number;
};

type ProvenanceFile = {
  id: string;
  file_path: string;
  agent_authored: boolean;
  agent_name: string | null;
  agent_lines: [number, number][];
  indicators: { type: string; commit: string; detail: string }[];
};

type Finding = {
  id: string;
  rule_id: string | null;
  message: string;
  severity: string;
  file_path: string;
  line_number: number;
};

function formatTimestamp(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortCommit(commit?: string | null) {
  return commit ? commit.slice(0, 7) : "unknown";
}

function labelForIndicator(type: string) {
  switch (type) {
    case "author-email":
      return "Git author email matched an AI agent";
    case "co-author":
      return "Git co-author trailer matched an AI agent";
    case "commit-message":
      return "Commit message mentioned AI generation";
    default:
      return type.replace(/-/g, " ");
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = String(severity || "").toUpperCase();
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

export default async function ProvenanceScanReceiptPage({ scanId }: { scanId: string }) {
  const supabase = await createClient();

  const { data: scan } = await supabase
    .from("scans")
    .select("id, project_id, branch, commit_hash, created_at, provenance_summary, provenance_agent_count, provenance_confidence, quality_gate_passed, ai_code_detected, ai_code_stats, projects(id, name, repo_url, org_id)")
    .eq("id", scanId)
    .single();

  if (!scan) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl p-6 lg:p-8">
          <ArtifactStateCard
            title="Scan not found"
            message="This provenance receipt could not be found. Go back to scan history and open another uploaded run."
            actions={[{ href: "/dashboard/scans", label: "Scan History", tone: "accent" }]}
          />
        </div>
      </main>
    );
  }

  const project = Array.isArray(scan.projects) ? scan.projects[0] : scan.projects;
  const { data: organization } = project?.org_id
    ? await supabase
        .from("organizations")
        .select("plan, pro_expires_at")
        .eq("id", project.org_id)
        .single()
    : { data: null as { plan?: string | null; pro_expires_at?: string | null } | null };

  const plan = getEffectivePlan({
    plan: organization?.plan || "free",
    pro_expires_at: organization?.pro_expires_at || null,
  });
  const canViewDetail = canViewProvenanceDetail(plan);
  const canAudit = canUseProvenanceAudit(plan);

  const { data: provenanceFilesData } = await supabase
    .from("provenance_files")
    .select("*")
    .eq("scan_id", scanId)
    .eq("agent_authored", true)
    .order("file_path");

  const provenanceFiles = (provenanceFilesData || []) as ProvenanceFile[];
  const provenancePaths = provenanceFiles.map((file) => file.file_path);
  const aiCodeStats = (scan.ai_code_stats || null) as AiCodeStats | null;
  const fallbackAiFiles = aiCodeStats?.ai_files || [];
  const effectivePaths = provenancePaths.length > 0 ? provenancePaths : fallbackAiFiles;

  const { data: findingsData } =
    effectivePaths.length > 0
      ? await supabase
          .from("findings")
          .select("id, rule_id, message, severity, file_path, line_number")
          .eq("scan_id", scanId)
          .in("file_path", effectivePaths)
          .order("severity")
      : { data: [] as Finding[] | null };

  const findings = (findingsData || []) as Finding[];
  const agents = Array.from(
    new Set([
      ...(scan.provenance_summary?.agents_seen || []),
      ...provenanceFiles.map((file) => file.agent_name).filter(Boolean) as string[],
    ])
  );
  const attributedFileCount = Math.max(
    Number(scan.provenance_agent_count || scan.provenance_summary?.agent_count || 0),
    provenanceFiles.length,
    fallbackAiFiles.length
  );
  const confidence = scan.provenance_confidence || aiCodeStats?.confidence || (attributedFileCount > 0 ? "recorded" : "unknown");
  const relatedFindingCount = Math.max(findings.length, aiCodeStats?.ai_findings_count || 0);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <ScrollToTopOnMount />
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <ArtifactReceiptHeader
          tone="violet"
          breadcrumbLabel="Provenance Receipt"
          badgeLabel="AI Provenance Receipt"
          projectName={project?.name || "Project"}
          projectHref={project?.id ? `/dashboard/projects/${project.id}` : null}
          title="One upload’s attribution evidence."
          description="Use this receipt to review the AI attribution evidence for one upload. Use Project Provenance for cross-run history and the code scan workbench for triage."
          note={`Uploaded ${formatTimestamp(scan.created_at)} from commit ${shortCommit(scan.commit_hash)}.`}
          actions={[
            { href: `/dashboard/projects/${scan.project_id}/provenance`, label: "Project Provenance", tone: "accent", scroll: true },
            { href: `/dashboard/projects/${scan.project_id}`, label: "Project Overview", scroll: true },
            { href: "/dashboard/scans", label: "Scan History", scroll: true },
            { href: `/dashboard/scans/${scan.id}`, label: "Code Scan Workbench", scroll: true },
          ]}
        />

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">AI-attributed files</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{attributedFileCount}</div>
              <div className="mt-2 text-sm text-slate-500">{agents.length ? agents.join(", ") : "AI attribution detected for this upload"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Confidence</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{confidence}</div>
              <div className="mt-2 text-sm text-slate-500">Based on git authorship signals like author email, co-author trailers, and commit text.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Related findings</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{relatedFindingCount}</div>
              <div className="mt-2 text-sm text-slate-500">Findings that land in the AI-attributed files from this same upload.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Uploaded</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{formatTimestamp(scan.created_at)}</div>
              <div className="mt-2 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" />
                  {scan.branch || "unknown branch"}
                </div>
                <div className="flex min-w-0 items-center gap-1.5 font-mono">
                  <GitCommit className="h-3.5 w-3.5" />
                  <span title={scan.commit_hash || "unknown commit"}>{shortCommit(scan.commit_hash)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Why Skylos marked these files as AI-authored</h2>
              </div>
              {canAudit ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/provenance/audit?project_id=${scan.project_id}&format=json`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Audit JSON
                  </a>
                  <a
                    href={`/api/provenance/audit?project_id=${scan.project_id}&format=csv`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Audit CSV
                  </a>
                </div>
              ) : null}
            </div>

            {provenanceFiles.length === 0 ? (
              aiCodeStats?.detected || aiCodeStats?.indicators?.length ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                    <div className="text-sm font-semibold text-violet-900">Scan-level attribution metadata is available</div>
                    <p className="mt-2 text-sm text-violet-800">
                      This scan has AI attribution signals on the scan record, but it does not have the newer per-file provenance rows attached.
                      Skylos can still show the files and git signals captured for this upload.
                    </p>
                  </div>

                  {fallbackAiFiles.length > 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Attributed files from scan metadata</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {fallbackAiFiles.map((filePath) => (
                          <span
                            key={filePath}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {filePath}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {aiCodeStats?.indicators?.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Attribution signals</div>
                      <div className="mt-3 space-y-3">
                        {aiCodeStats.indicators.map((indicator, index) => (
                          <div key={`${indicator.type}-${indicator.commit}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-sm font-semibold text-slate-900">{labelForIndicator(indicator.type)}</div>
                            <div className="mt-1 text-xs text-slate-500">{indicator.detail}</div>
                            <div className="mt-2 font-mono text-[11px] text-slate-400">{indicator.commit}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  No AI-authored files were recorded for this scan.
                </div>
              )
            ) : canViewDetail ? (
              <ProvenanceDetail scanId={scan.id} files={provenanceFiles} />
            ) : (
              <div className="mt-6">
                <ProFeatureLock
                  feature="Per-file AI provenance evidence"
                  description="See the exact file, line ranges, and git signals Skylos used to attribute code to an AI agent."
                />
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Related findings</div>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Security and quality signals in attributed files</h2>
              {findings.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No findings landed in the attributed files for this scan.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {findings.slice(0, 8).map((finding) => (
                    <div key={finding.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={finding.severity} />
                        <span className="font-mono text-[11px] text-slate-500">{finding.rule_id || "unknown"}</span>
                      </div>
                      <div className="mt-2 text-sm font-medium text-slate-900">{finding.message}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {finding.file_path} · line {finding.line_number}
                      </div>
                    </div>
                  ))}
                  <Link
                    href={`/dashboard/scans/${scan.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    Open full code scan workbench
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-500" />
                <div className="text-sm font-semibold text-slate-900">Risk cross-analysis</div>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                If you have Workspace access and enough credits, provenance risk intersection can cross-reference AI-attributed files with findings and defense failures.
              </p>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                Endpoint: <span className="font-mono">/api/provenance/risk-intersection</span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
