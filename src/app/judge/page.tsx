import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bot,
  Clock3,
  GitBranch,
  ShieldCheck,
  TimerReset,
  UploadCloud,
} from "lucide-react";
import { getJudgeRepoIndex } from "@/lib/judge";
import { DEFAULT_JUDGE_SEED_REPOS } from "@/lib/judge-seeds";
import SuggestJudgeRepoForm from "@/components/judge/SuggestJudgeRepoForm";
import { getSiteUrl } from "@/lib/site";
import { buildCollectionPageSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Skylos Judge",
  description:
    "Public repo scorecards with deterministic static grades, pinned commits, and an optional AI review lane.",
  alternates: {
    canonical: "/judge",
  },
  openGraph: {
    title: "Skylos Judge",
    description:
      "Public repo scorecards with deterministic static grades, pinned commits, and an optional AI review lane.",
    type: "website",
  },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function describeJobStatus(activeJob: { status: string } | null) {
  if (!activeJob) return "Waiting for first import";
  if (activeJob.status === "running") return "Import running";
  return "Queued for first scan";
}

function describeAiReview(input: {
  hasAgentSnapshot: boolean;
  activeJob: { agent_status: string } | null;
}): string {
  if (input.hasAgentSnapshot) return "AI review available";
  if (!input.activeJob) return "AI review not attached";
  if (input.activeJob.agent_status === "running") return "AI review running";
  if (input.activeJob.agent_status === "pending") return "AI review queued";
  return "AI review not attached";
}

export default async function JudgeIndexPage() {
  const repos = await getJudgeRepoIndex();
  const siteUrl = getSiteUrl();
  const structuredData = buildCollectionPageSchema({
    name: "Skylos Judge",
    description:
      "Public repository scorecards powered by Skylos for security, quality, and dead code on pinned commits.",
    url: `${siteUrl}/judge`,
    itemUrls: repos.map(({ repo }) => ({
      name: `${repo.owner}/${repo.name}`,
      url: `${siteUrl}/judge/${repo.owner}/${repo.name}`,
    })),
  });

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Public repo scorecards
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Judge should read clearly the moment you land on it
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Judge now has two explicit lanes. Public users browse deterministic repo scorecards. Operators run a pinned static scan,
              then optionally attach an AI review as a second pass.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="#scorecards"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Browse scorecards
            </Link>
            <Link
              href="/judge/submit"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300"
            >
              Run and import a snapshot
            </Link>
            <Link
              href="#suggest-repo"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              Suggest a public repo
            </Link>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <JudgeLaneCard
              icon={ShieldCheck}
              title="Public grade"
              description="Static, deterministic, and tied to one pinned commit. This is the public score users compare over time."
            />
            <JudgeLaneCard
              icon={Bot}
              title="AI review"
              description="Optional second pass for richer context. It is visible separately so the public grade never feels like an arbitrary LLM verdict."
            />
            <JudgeLaneCard
              icon={UploadCloud}
              title="Operator import"
              description="There is now a real submit surface at `/judge/submit` so importing a snapshot no longer requires guessing the admin API contract."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">How Judge works</div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">One public score, one optional AI review, one pinned commit</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <StepCard
                step="1"
                title="Run static on a pinned commit"
                body="This creates the deterministic public grade and the historical scorecard."
              />
              <StepCard
                step="2"
                title="Optionally run an AI review"
                body="Import it as a separate `agent` snapshot so it adds context without rewriting the public grade."
              />
              <StepCard
                step="3"
                title="Publish the scorecard"
                body="Users see the grade, commit, scan date, findings summary, and whether an AI review exists."
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Operator quick path</div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Need to run and upload a repo yourself?</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Use the Judge submit page. It gives you the run commands, the accepted report formats, and a real import form wired to the existing admin endpoint.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-white px-4 py-3">Supports Skylos JSON, SARIF, Claude Code Security JSON, and normalized summary/findings payloads.</div>
              <div className="rounded-2xl bg-white px-4 py-3">Static imports publish the public score. Agent imports attach the optional AI review.</div>
            </div>
            <Link
              href="/judge/submit"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open Judge submit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="scorecards" className="mx-auto max-w-6xl px-6 py-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Tracked repos</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Public scorecards</h2>
          </div>
          <div className="text-sm text-slate-500">
            Every card shows the public grade first, then whether an AI review exists.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {repos.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">Judge is ready, but no snapshots are published yet.</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Seed a starting set or open Judge submit to import the first pinned static grade. After that, optionally attach an AI review for the same commit.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {DEFAULT_JUDGE_SEED_REPOS.map((repo) => (
                <div key={repo.sourceUrl} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm font-semibold text-slate-900">{repo.owner}/{repo.name}</div>
                  <div className="mt-2 text-sm text-slate-500">{repo.language}</div>
                </div>
              ))}
            </div>
            <Link
              href="/judge/submit"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Import the first snapshot
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {repos.map(({ repo, latestSnapshot, latestAgentSnapshot, activeJob }) => {
              const queuedStatus = describeJobStatus(activeJob);
              const aiReviewCopy = describeAiReview({
                hasAgentSnapshot: Boolean(latestAgentSnapshot),
                activeJob,
              });

              return (
                <Link
                  key={`${repo.owner}/${repo.name}`}
                  href={`/judge/${repo.owner}/${repo.name}`}
                  className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{repo.language || "unknown"}</div>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{repo.owner}/{repo.name}</h3>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Public grade</div>
                      {latestSnapshot ? (
                        <>
                          <div className="mt-1 text-2xl font-black text-slate-950">{latestSnapshot.grade}</div>
                          <div className="text-sm font-semibold text-slate-500">{latestSnapshot.overall_score}/100</div>
                        </>
                      ) : (
                        <div className="mt-1 text-sm font-semibold text-amber-900">{queuedStatus}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <MiniStatusCard
                      label="Public grade"
                      value={latestSnapshot ? "Published" : queuedStatus}
                      tone={latestSnapshot ? "emerald" : "amber"}
                    />
                    <MiniStatusCard
                      label="AI review"
                      value={aiReviewCopy}
                      tone={latestAgentSnapshot ? "violet" : "slate"}
                    />
                  </div>

                  {latestSnapshot ? (
                    <>
                      <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                        <ScoreTile label="Security" value={latestSnapshot.security_score} />
                        <ScoreTile label="Quality" value={latestSnapshot.quality_score} />
                        <ScoreTile label="Dead Code" value={latestSnapshot.dead_code_score} />
                      </div>
                      <div className="mt-6 space-y-2 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          <span>{latestSnapshot.branch || repo.default_branch || "main"} @ {latestSnapshot.commit_sha.slice(0, 7)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4" />
                          <span>Scanned {formatDate(latestSnapshot.scanned_at)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                      <TimerReset className="h-4 w-4" />
                      <span>{queuedStatus}</span>
                    </div>
                  )}

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    Open scorecard
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section id="suggest-repo" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <SuggestJudgeRepoForm />

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Choose the right Judge path</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                <strong className="text-slate-900">Public repo suggestion</strong>: use the form on the left when you want a repo added to the queue.
              </p>
              <p>
                <strong className="text-slate-900">Operator import</strong>: use Judge submit when you already have a pinned report and want to publish or update a scorecard yourself.
              </p>
              <p>
                <strong className="text-slate-900">AI judge / AI review</strong>: yes, Judge can store it. Import it as the optional <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">agent</code> snapshot so it stays separate from the deterministic public score.
              </p>
            </div>
            <Link
              href="/judge/submit"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open Judge submit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function JudgeLaneCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">{step}</div>
      <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
    </div>
  );
}

function MiniStatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "violet" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-950"
      : tone === "amber"
      ? "bg-amber-50 text-amber-950"
      : tone === "violet"
      ? "bg-violet-50 text-violet-950"
      : "bg-slate-50 text-slate-900";

  return (
    <div className={`rounded-2xl px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-950">{value}</div>
    </div>
  );
}
