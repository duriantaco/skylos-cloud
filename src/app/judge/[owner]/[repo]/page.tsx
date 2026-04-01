import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import { AlertTriangle, ArrowRight, Clock3, GitBranch, Scale, Shield, Sparkles } from "lucide-react";
import { getJudgeRepoDetail } from "@/lib/judge";
import type { JudgeFindingPreview } from "@/lib/judge-core";
import { getSiteUrl } from "@/lib/site";
import { buildBreadcrumbList } from "@/lib/structured-data";

type PageProps = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, repo } = await params;
  const canonical = `/judge/${owner.toLowerCase()}/${repo.toLowerCase()}`;

  try {
    const detail = await getJudgeRepoDetail(owner, repo);
    if (!detail.latestSnapshot) {
      return {
        title: `${detail.repo.owner}/${detail.repo.name} — Skylos Judge`,
        description: `Skylos Judge is queued to scan ${detail.repo.owner}/${detail.repo.name}.`,
        alternates: {
          canonical,
        },
      };
    }

    return {
      title: `${detail.repo.owner}/${detail.repo.name} security score and dead code grade`,
      description: `Skylos Judge scored ${detail.repo.owner}/${detail.repo.name} ${detail.latestSnapshot.overall_score}/100 for security, quality, and dead code on commit ${detail.latestSnapshot.commit_sha.slice(0, 7)}.`,
      alternates: {
        canonical,
      },
      openGraph: {
        title: `${detail.repo.owner}/${detail.repo.name} — Grade ${detail.latestSnapshot.grade}`,
        description: `Security ${detail.latestSnapshot.security_score}, quality ${detail.latestSnapshot.quality_score}, dead code ${detail.latestSnapshot.dead_code_score}.`,
        type: "website",
      },
    };
  } catch {
    return {
      title: "Repo Not Found — Skylos Judge",
    };
  }
}

function formatJudgeDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function describeStaticStatus(input: {
  hasSnapshot: boolean;
  activeJobStatus: string | null | undefined;
  staticStatus: string | null | undefined;
}): { label: string; description: string } {
  if (input.hasSnapshot) {
    return {
      label: "Ready",
      description: "Static analysis produced the public Judge grade on this page.",
    };
  }

  if (input.staticStatus === "running" || input.activeJobStatus === "running") {
    return {
      label: "Running",
      description: "The worker is currently running the deterministic static pass.",
    };
  }

  return {
    label: "Queued",
    description: "A static Judge snapshot has not been imported yet.",
  };
}

function describeAgentStatus(input: {
  hasSnapshot: boolean;
  agentStatus: string | null | undefined;
}): { label: string; description: string } {
  if (input.hasSnapshot) {
    return {
      label: "Available",
      description:
        "A separate Skylos agent snapshot exists for this repo. It can deepen the analysis later without changing the public grade.",
    };
  }

  if (input.agentStatus === "running") {
    return {
      label: "Running",
      description: "The optional Skylos agent pass is in progress.",
    };
  }

  if (input.agentStatus === "pending") {
    return {
      label: "Queued",
      description: "The optional Skylos agent pass is requested after static analysis.",
    };
  }

  return {
    label: "Not requested",
    description: "Judge can publish static-only pages. Agent analysis is an optional second pass.",
  };
}

export default async function JudgeRepoPage({ params }: PageProps) {
  const { owner, repo } = await params;
  const detail = await getJudgeRepoDetail(owner, repo).catch(() => null);

  if (!detail) {
    notFound();
  }

  const snapshot = detail.latestSnapshot;
  const agentSnapshot = detail.latestAgentSnapshot;
  const countSummary = (snapshot?.summary?.counts || {}) as Record<string, number>;
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/judge/${detail.repo.owner}/${detail.repo.name}`;
  const staticStatus = describeStaticStatus({
    hasSnapshot: Boolean(snapshot),
    activeJobStatus: detail.activeJob?.status,
    staticStatus: detail.activeJob?.static_status,
  });
  const agentStatus = describeAgentStatus({
    hasSnapshot: Boolean(agentSnapshot),
    agentStatus: detail.activeJob?.agent_status,
  });
  const structuredData = [
    buildBreadcrumbList([
      { name: "Home", item: siteUrl },
      { name: "Judge", item: `${siteUrl}/judge` },
      { name: `${detail.repo.owner}/${detail.repo.name}`, item: pageUrl },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${detail.repo.owner}/${detail.repo.name} - Skylos Judge`,
      description: snapshot
        ? `Security ${snapshot.security_score}, quality ${snapshot.quality_score}, and dead code ${snapshot.dead_code_score} on commit ${snapshot.commit_sha.slice(0, 7)}.`
        : `Skylos Judge queue page for ${detail.repo.owner}/${detail.repo.name}.`,
      url: pageUrl,
      isPartOf: {
        "@type": "WebSite",
        name: "Skylos",
        url: siteUrl,
      },
      about: {
        "@type": "SoftwareSourceCode",
        name: `${detail.repo.owner}/${detail.repo.name}`,
        codeRepository: detail.repo.source_url,
        programmingLanguage: detail.repo.language || undefined,
      },
      dateModified: snapshot?.scanned_at || detail.repo.last_scanned_at || undefined,
    },
  ];

  return (
    <>
      {structuredData.map((schema, index) => (
        <script
          key={`judge-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <Link href="/judge" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
              <ArrowRight className="h-4 w-4 rotate-180" />
              Back to Judge
            </Link>

            <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{detail.repo.language || "unknown"}</div>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                  {detail.repo.owner}/{detail.repo.name}
                </h1>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  Public repo scorecard generated from a pinned commit using deterministic Skylos scoring. The grade comes from static analysis only, while Skylos agent runs as an optional second pass for deeper context.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-500">
                  <a
                    href={detail.repo.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Open repository
                  </a>
                  <Link
                    href="/judge#suggest-repo"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Suggest a repo
                  </Link>
                </div>
              </div>

              {snapshot ? (
                <div className="rounded-[28px] bg-slate-950 px-8 py-7 text-white shadow-lg">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Overall</div>
                  <div className="mt-2 flex items-end gap-4">
                    <div className="text-6xl font-black">{snapshot.grade}</div>
                    <div className="pb-1 text-right">
                      <div className="text-3xl font-bold">{snapshot.overall_score}</div>
                      <div className="text-sm text-slate-300">/ 100</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] bg-amber-50 px-8 py-7 text-amber-950 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.18em]">Status</div>
                  <div className="mt-3 text-2xl font-bold">{staticStatus.label}</div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10">
          {snapshot ? (
            <>
              <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <BreakdownCard label="Security" value={snapshot.security_score} icon={Shield} />
                    <BreakdownCard label="Quality" value={snapshot.quality_score} icon={Sparkles} />
                    <BreakdownCard label="Dead Code" value={snapshot.dead_code_score} icon={Scale} />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-950">Finding summary</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <StatCard label="Critical" value={countSummary.critical || 0} tone="rose" />
                      <StatCard label="High" value={countSummary.high || 0} tone="orange" />
                      <StatCard label="Quality" value={countSummary.quality || 0} tone="blue" />
                      <StatCard label="Dead Code" value={countSummary.dead_code || 0} tone="slate" />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-950">Top findings</h2>
                    <div className="mt-5 space-y-3">
                      {Array.isArray(snapshot.top_findings) && snapshot.top_findings.length > 0 ? (
                        snapshot.top_findings.map((finding: JudgeFindingPreview, index: number) => (
                          <div key={`${finding.ruleId}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">
                              <span className="rounded-full bg-slate-900 px-2 py-1 text-white">{finding.severity}</span>
                              <span className="text-slate-500">{finding.category}</span>
                              <span className="text-slate-400">{finding.ruleId}</span>
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-900">{finding.message}</p>
                            <p className="mt-2 text-sm text-slate-500">
                              {finding.filePath}:{finding.lineNumber}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No preview findings were stored for this snapshot.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-950">Analysis pipeline</h2>
                    <div className="mt-5 space-y-4">
                      <PipelineRow
                        label="Skylos static"
                        status={staticStatus.label}
                        description={staticStatus.description}
                        meta={snapshot ? `${snapshot.commit_sha.slice(0, 7)} • ${formatJudgeDate(snapshot.scanned_at)}` : null}
                      />
                      <PipelineRow
                        label="Skylos agent"
                        status={agentStatus.label}
                        description={agentStatus.description}
                        meta={agentSnapshot ? `${agentSnapshot.commit_sha.slice(0, 7)} • ${formatJudgeDate(agentSnapshot.scanned_at)}` : null}
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-950">Snapshot metadata</h2>
                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                      <MetaRow
                        icon={GitBranch}
                        label="Commit"
                        value={`${snapshot.branch || detail.repo.default_branch || "main"} @ ${snapshot.commit_sha}`}
                      />
                      <MetaRow icon={Clock3} label="Scanned" value={formatJudgeDate(snapshot.scanned_at)} />
                      <MetaRow icon={Scale} label="Scoring" value={snapshot.scoring_version} />
                      <MetaRow icon={Sparkles} label="Confidence" value={`${snapshot.confidence_score}/100`} />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-950">Fairness notes</h2>
                    <div className="mt-4 space-y-3">
                      {Array.isArray(snapshot.fairness_notes) && snapshot.fairness_notes.length > 0 ? (
                        snapshot.fairness_notes.map((note: string) => (
                          <div key={note} className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{note}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No fairness caveats were attached to this snapshot. It was imported as a normal deterministic grade.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-950">Static history</h2>
                    <div className="mt-4 space-y-3">
                      {detail.history.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                          <div>
                            <div className="font-semibold text-slate-900">{entry.commit_sha.slice(0, 7)}</div>
                            <div className="text-slate-500">{formatJudgeDate(entry.scanned_at)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-950">{entry.grade}</div>
                            <div className="text-slate-500">{entry.overall_score}/100</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-950">This repo is in the Judge queue.</h2>
              <p className="mt-3 max-w-2xl text-slate-600">
                The repo row exists, but no static snapshot has been imported yet. The production flow is: shallow clone a pinned commit in a worker, run Skylos static, optionally run Skylos agent, then import immutable snapshots into Judge.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function BreakdownCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-500">{label}</div>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-4 text-4xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "rose" | "orange" | "blue" | "slate";
}) {
  const classes =
    tone === "rose"
      ? "bg-rose-50 text-rose-950"
      : tone === "orange"
      ? "bg-orange-50 text-orange-950"
      : tone === "blue"
      ? "bg-blue-50 text-blue-950"
      : "bg-slate-50 text-slate-950";

  return (
    <div className={`rounded-2xl p-4 ${classes}`}>
      <div className="text-xs font-bold uppercase tracking-[0.14em]">{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400" />
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
        <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function PipelineRow({
  label,
  status,
  description,
  meta,
}: {
  label: string;
  status: string;
  description: string;
  meta: string | null;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
          {status}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
      {meta ? <div className="mt-3 text-xs font-medium text-slate-500">{meta}</div> : null}
    </div>
  );
}
