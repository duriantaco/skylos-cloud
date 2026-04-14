import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Fingerprint, GitBranch, GitCommit, Shield } from "lucide-react";

import ProjectSectionTabs from "@/components/ProjectSectionTabs";
import ProFeatureLock from "@/components/ProFeatureLock";
import ProvenanceDetail from "@/components/ProvenanceDetail";
import ScrollToTopOnMount from "@/components/ScrollToTopOnMount";
import { canUseProvenanceAudit, canViewProvenanceDetail, getEffectivePlan } from "@/lib/entitlements";
import { ensureWorkspace } from "@/lib/ensureWorkspace";

type ProvenanceSummary = {
  total_files?: number;
  agent_count?: number;
  human_count?: number;
  agents_seen?: string[];
};

type ScanRow = {
  id: string;
  created_at: string;
  branch: string | null;
  commit_hash: string | null;
  provenance_agent_count: number | null;
  provenance_confidence: string | null;
  provenance_summary: ProvenanceSummary | null;
};

type ProvenanceFile = {
  id: string;
  scan_id: string;
  file_path: string;
  agent_authored: boolean;
  agent_name: string | null;
  agent_lines: [number, number][];
  indicators: { type: string; commit: string; detail: string }[];
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

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function shortCommit(commit?: string | null) {
  return commit ? commit.slice(0, 7) : "unknown";
}

function derivedAgentFileCount(
  scan: Pick<ScanRow, "id" | "provenance_agent_count" | "provenance_summary">,
  filesByScan: Map<string, ProvenanceFile[]>
) {
  const summaryCount = Number(scan.provenance_agent_count ?? scan.provenance_summary?.agent_count ?? 0);
  const fileCount = filesByScan.get(scan.id)?.length || 0;
  return Math.max(summaryCount, fileCount);
}

export default async function ProjectProvenancePage({
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
  const canViewDetail = canViewProvenanceDetail(effectivePlan);
  const canAudit = canUseProvenanceAudit(effectivePlan);

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, repo_url")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
            Project not found.
          </div>
        </div>
      </main>
    );
  }

  const { data: scansRaw } = await supabase
    .from("scans")
    .select("id, created_at, branch, commit_hash, provenance_agent_count, provenance_confidence, provenance_summary")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const recentScans = (scansRaw || []) as ScanRow[];
  const scanIds = recentScans.map((scan) => scan.id);

  const { data: provenanceFilesData } =
    scanIds.length > 0
      ? await supabase
          .from("provenance_files")
          .select("*")
          .in("scan_id", scanIds)
          .eq("agent_authored", true)
          .order("file_path")
      : { data: [] as ProvenanceFile[] | null };

  const provenanceFiles = (provenanceFilesData || []) as ProvenanceFile[];
  const filesByScan = new Map<string, ProvenanceFile[]>();
  for (const file of provenanceFiles) {
    const existing = filesByScan.get(file.scan_id) || [];
    existing.push(file);
    filesByScan.set(file.scan_id, existing);
  }

  const scans = recentScans.filter((scan) => derivedAgentFileCount(scan, filesByScan) > 0);
  const latestScan = scans[0] || null;
  const latestFiles = latestScan ? filesByScan.get(latestScan.id) || [] : [];

  const distinctAgents = Array.from(
    new Set(
      scans.flatMap((scan) => [
        ...(scan.provenance_summary?.agents_seen || []),
        ...(filesByScan.get(scan.id) || []).map((file) => file.agent_name).filter(Boolean) as string[],
      ])
    )
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <ScrollToTopOnMount />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Link href={`/dashboard/projects/${id}`} className="text-slate-500 hover:text-slate-900">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-slate-900">{project.name}</div>
                  {project.repo_url ? (
                    <a
                      href={project.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                    >
                      {project.repo_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-5">
                <ProjectSectionTabs projectId={id} active="provenance" />
              </div>

              <div className="mt-6 max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                  <Fingerprint className="h-3.5 w-3.5" />
                  AI Provenance
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  Project-level attribution history, separate from scan triage.
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Use this page to understand whether AI-authored code keeps showing up in this project, which agents were involved,
                  and where to open the receipt for one specific upload.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {latestScan ? (
                <Link
                  href={`/dashboard/scans/${latestScan.id}/provenance`}
                  scroll
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
                >
                  Latest provenance receipt
                </Link>
              ) : null}
              <Link
                href={`/dashboard/projects/${id}/defense`}
                scroll
                className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
              >
                <Shield className="h-4 w-4" />
                AI Defense
              </Link>
              <Link
                href="/dashboard/scans"
                scroll
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                Scan History
              </Link>
            </div>
          </div>

          {latestScan ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Latest attributed files</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{derivedAgentFileCount(latestScan, filesByScan)}</div>
                <div className="mt-2 text-sm text-slate-500">From the latest provenance-backed upload.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Latest confidence</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{latestScan.provenance_confidence || "low"}</div>
                <div className="mt-2 text-sm text-slate-500">Confidence in the attribution evidence.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Agents seen</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{distinctAgents.length}</div>
                <div className="mt-2 text-sm text-slate-500">{distinctAgents.length ? distinctAgents.join(", ") : "No agents detected"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Receipts</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{scans.length}</div>
                <div className="mt-2 text-sm text-slate-500">Recent provenance-backed uploads in this project.</div>
              </div>
            </div>
          ) : null}
        </div>

        {!latestScan ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Fingerprint className="mx-auto h-10 w-10 text-violet-300" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">No AI provenance data yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Run a normal Skylos upload from a git repo with AI-authored code so provenance can be attached to the scan.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Latest receipt evidence</div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">What Skylos attributed in the latest upload</h2>
                </div>
                {canAudit ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/provenance/audit?project_id=${id}&format=json`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Audit JSON
                    </a>
                    <a
                      href={`/api/provenance/audit?project_id=${id}&format=csv`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Audit CSV
                    </a>
                  </div>
                ) : null}
              </div>

              {canViewDetail ? (
                <ProvenanceDetail scanId={latestScan.id} files={latestFiles} />
              ) : (
                <div className="mt-6">
                  <ProFeatureLock
                    feature="Per-file AI provenance evidence"
                    description="See which files were attributed to AI, which lines were involved, and what git evidence Skylos used."
                  />
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Latest provenance receipt</div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">{timeAgo(latestScan.created_at)}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatTimestamp(latestScan.created_at)}</div>
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5" />
                      {latestScan.branch || "unknown branch"}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <GitCommit className="h-3.5 w-3.5" />
                      {shortCommit(latestScan.commit_hash)}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/scans/${latestScan.id}/provenance`}
                      className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      Open receipt
                    </Link>
                    <Link
                      href={`/dashboard/scans/${latestScan.id}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Open code scan
                    </Link>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Recent provenance receipts</div>
                <div className="mt-4 space-y-3">
                  {scans.slice(0, 8).map((scan) => (
                    <div key={scan.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{timeAgo(scan.created_at)}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {derivedAgentFileCount(scan, filesByScan)} AI file{derivedAgentFileCount(scan, filesByScan) === 1 ? "" : "s"} · {scan.provenance_confidence || "low"} confidence
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/scans/${scan.id}/provenance`}
                          className="text-xs font-semibold text-violet-700 hover:text-violet-900"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
