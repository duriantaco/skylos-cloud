import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock3,
  GitBranch,
  Scale,
  Shield,
  Sparkles,
  UploadCloud,
} from "lucide-react";
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

function describePublicGradeStatus(input: {
  hasSnapshot: boolean;
  activeJobStatus: string | null | undefined;
  staticStatus: string | null | undefined;
}): { label: string; description: string } {
  if (input.hasSnapshot) {
    return {
      label: "Published",
      description: "This deterministic static snapshot is the public grade users see on this page.",
    };
  }

  if (input.staticStatus === "running" || input.activeJobStatus === "running") {
    return {
      label: "Running",
      description: "The pinned static pass is running now. This pass produces the public grade.",
    };
  }

  return {
    label: "Queued",
    description: "A public static snapshot has not been imported yet.",
  };
}

function describeAiReviewStatus(input: {
  hasSnapshot: boolean;
  agentStatus: string | null | undefined;
}): { label: string; description: string } {
  if (input.hasSnapshot) {
    return {
      label: "Available",
      description:
        "An optional AI review snapshot exists for this same repo. It adds context, but it does not rewrite the public grade.",
    };
  }

  if (input.agentStatus === "running") {
    return {
      label: "Running",
      description: "The optional AI review pass is running now.",
    };
  }

  if (input.agentStatus === "pending") {
    return {
      label: "Queued",
      description: "The optional AI review pass is requested after the public static grade.",
    };
  }

  return {
    label: "Not attached",
    description: "No AI review is attached yet. Judge can publish a static-only scorecard.",
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
  const countSummary = ((snapshot?.summary?.counts || {}) as Record<string, number>) || {};
  const staticSummary = ((snapshot?.summary || {}) as Record<string, unknown>) || {};
  const agentSummary = ((agentSnapshot?.summary || {}) as Record<string, unknown>) || {};
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/judge/${detail.repo.owner}/${detail.repo.name}`;
  const submitHref = `/judge/submit?owner=${encodeURIComponent(detail.repo.owner)}&repo=${encodeURIComponent(detail.repo.name)}&source_url=${encodeURIComponent(detail.repo.source_url)}&branch=${encodeURIComponent(detail.repo.default_branch || "main")}`;
  const publicGradeStatus = describePublicGradeStatus({
    hasSnapshot: Boolean(snapshot),
    activeJobStatus: detail.activeJob?.status,
    staticStatus: detail.activeJob?.static_status,
  });
  const aiReviewStatus = describeAiReviewStatus({
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
                  This page separates the public deterministic grade from the optional AI review. Users should be able to tell immediately what affects the score, what is extra context, and which commit the score belongs to.
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
                    href={submitHref}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Run or import a new snapshot
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <StatusHeroCard
                  label="Public grade"
                  tone={snapshot ? "dark" : "amber"}
                  value={snapshot ? snapshot.grade : publicGradeStatus.label}
                  subvalue={snapshot ? `${snapshot.overall_score}/100` : "Pinned static snapshot"}
                />
                <StatusHeroCard
                  label="AI review"
                  tone={agentSnapshot ? "violet" : "slate"}
                  value={aiReviewStatus.label}
                  subvalue={agentSnapshot ? "Optional second pass attached" : "Does not affect public grade"}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10">
          {snapshot ? (
            <div className="grid gap-5 lg:grid-cols-[1.55fr_0.95fr]">
              <div className="space-y-5">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Public score breakdown</div>
                      <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">What this repo scored on the pinned static snapshot</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        The public grade comes from the static snapshot only. The optional AI review appears separately so it can add context without moving the public score.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <BreakdownCard label="Security" value={snapshot.security_score} icon={Shield} />
                      <BreakdownCard label="Quality" value={snapshot.quality_score} icon={Sparkles} />
                      <BreakdownCard label="Dead code" value={snapshot.dead_code_score} icon={Scale} />
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">Finding summary</h2>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Severity and category counts from the same pinned static snapshot that produced the public grade.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Total issues</div>
                      <div className="mt-1 text-2xl font-black text-slate-950">{countSummary.total_issues || 0}</div>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <StatCard label="Critical" value={countSummary.critical || 0} tone="rose" />
                    <StatCard label="High" value={countSummary.high || 0} tone="amber" />
                    <StatCard label="Secrets" value={countSummary.secrets || 0} tone="violet" />
                    <StatCard label="Quality" value={countSummary.quality || 0} tone="blue" />
                    <StatCard label="Dead code" value={countSummary.dead_code || 0} tone="slate" />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">Top findings</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    The highest-priority preview findings from the public static snapshot. This is the fast way to understand why the score landed where it did.
                  </p>
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
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">How this scorecard was produced</h2>
                  <div className="mt-5 space-y-4">
                    <PipelineRow
                      label="Public grade"
                      status={publicGradeStatus.label}
                      description={publicGradeStatus.description}
                      meta={`${snapshot.commit_sha.slice(0, 7)} • ${formatJudgeDate(snapshot.scanned_at)}`}
                    />
                    <PipelineRow
                      label="AI review"
                      status={aiReviewStatus.label}
                      description={aiReviewStatus.description}
                      meta={agentSnapshot ? `${agentSnapshot.commit_sha.slice(0, 7)} • ${formatJudgeDate(agentSnapshot.scanned_at)}` : null}
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">Snapshot metadata</h2>
                  <div className="mt-5 space-y-3 text-sm text-slate-600">
                    <MetaRow
                      icon={GitBranch}
                      label="Commit"
                      value={`${snapshot.branch || detail.repo.default_branch || "main"} @ ${snapshot.commit_sha}`}
                    />
                    <MetaRow icon={Clock3} label="Scanned" value={formatJudgeDate(snapshot.scanned_at)} />
                    <MetaRow
                      icon={Scale}
                      label="Scoring"
                      value={`${snapshot.scoring_version} • ${String(staticSummary.tool || "skylos")}`}
                    />
                    <MetaRow icon={Sparkles} label="Confidence" value={`${snapshot.confidence_score}/100`} />
                    {snapshot.analysis_mode ? (
                      <MetaRow icon={Sparkles} label="Analysis mode" value={snapshot.analysis_mode} />
                    ) : null}
                    {agentSnapshot ? (
                      <MetaRow
                        icon={Bot}
                        label="AI review source"
                        value={`${String(agentSummary.tool || agentSummary.source || "agent")} • ${agentSnapshot.confidence_score}/100 confidence`}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                  <h2 className="text-xl font-bold text-slate-950">Need to refresh this repo?</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Open Judge submit with this repo prefilled. That gives you a direct operator path to run a new static snapshot and optionally attach an AI review.
                  </p>
                  <Link
                    href={submitHref}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Open Judge submit
                    <UploadCloud className="h-4 w-4" />
                  </Link>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">Fairness notes</h2>
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
                        No fairness caveats were attached to this snapshot.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">Static history</h2>
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
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">No public grade yet</div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">This repo is in the Judge queue</h2>
                <p className="mt-4 max-w-2xl text-slate-600">
                  The repo exists, but no static snapshot has been imported yet. Public scorecards only appear after the pinned static pass is uploaded. AI review is optional and can be imported after that.
                </p>
                <Link
                  href={submitHref}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Import the first snapshot
                  <UploadCloud className="h-4 w-4" />
                </Link>
              </div>

              <div className="space-y-5">
                <PipelineRow
                  label="Public grade"
                  status={publicGradeStatus.label}
                  description={publicGradeStatus.description}
                  meta={null}
                />
                <PipelineRow
                  label="AI review"
                  status={aiReviewStatus.label}
                  description={aiReviewStatus.description}
                  meta={null}
                />
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function StatusHeroCard({
  label,
  tone,
  value,
  subvalue,
}: {
  label: string;
  tone: "dark" | "violet" | "amber" | "slate";
  value: string;
  subvalue: string;
}) {
  const classes =
    tone === "dark"
      ? "bg-slate-950 text-white"
      : tone === "violet"
      ? "bg-violet-50 text-violet-950"
      : tone === "amber"
      ? "bg-amber-50 text-amber-950"
      : "bg-slate-100 text-slate-950";

  const subClasses =
    tone === "dark" ? "text-slate-300" : tone === "violet" ? "text-violet-700" : tone === "amber" ? "text-amber-700" : "text-slate-500";

  return (
    <div className={`rounded-[28px] px-6 py-5 shadow-sm ${classes}`}>
      <div className={`text-xs font-bold uppercase tracking-[0.18em] ${subClasses}`}>{label}</div>
      <div className="mt-3 text-3xl font-black tracking-tight">{value}</div>
      <div className={`mt-2 text-sm ${subClasses}`}>{subvalue}</div>
    </div>
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
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-700">{label}</div>
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mt-4 text-5xl font-black tracking-tight text-slate-950">{value}</div>
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
  tone: "rose" | "amber" | "blue" | "violet" | "slate";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-rose-950"
      : tone === "amber"
      ? "bg-amber-50 text-amber-950"
      : tone === "blue"
      ? "bg-blue-50 text-blue-950"
      : tone === "violet"
      ? "bg-violet-50 text-violet-950"
      : "bg-slate-50 text-slate-950";

  return (
    <div className={`rounded-[24px] p-5 ${toneClass}`}>
      <div className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-4 text-4xl font-black tracking-tight">{value}</div>
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
    <div className="rounded-[24px] bg-slate-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-bold text-slate-950">{label}</div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          {status}
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      {meta ? <div className="mt-4 text-sm font-semibold text-slate-500">{meta}</div> : null}
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
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400" />
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
        <div className="mt-1 font-medium text-slate-900">{value}</div>
      </div>
    </div>
  );
}
