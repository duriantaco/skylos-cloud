import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock3, GitBranch, ShieldCheck, TimerReset } from "lucide-react";
import { getJudgeRepoIndex } from "@/lib/judge";
import { DEFAULT_JUDGE_SEED_REPOS } from "@/lib/judge-seeds";
import SuggestJudgeRepoForm from "@/components/judge/SuggestJudgeRepoForm";
import { getSiteUrl } from "@/lib/site";
import { buildCollectionPageSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Skylos Judge",
  description:
    "Public repository scorecards powered by Skylos. Deterministic grades for security, quality, and dead code on pinned commits.",
  alternates: {
    canonical: "/judge",
  },
  openGraph: {
    title: "Skylos Judge",
    description:
      "Public repository scorecards powered by Skylos. Deterministic grades for security, quality, and dead code on pinned commits.",
    type: "website",
  },
};

function statusCopy(activeJob: { status: string } | null) {
  if (!activeJob) return null;
  if (activeJob.status === "running") return "Scanning now";
  return "Queued for first scan";
}

function analysisCopy(input: {
  hasAgentSnapshot: boolean;
  activeJob: {
    agent_status: string;
  } | null;
}): string | null {
  if (input.hasAgentSnapshot) {
    return "Agent review available";
  }

  if (!input.activeJob) {
    return null;
  }

  if (input.activeJob.agent_status === "running") {
    return "Agent review running";
  }

  if (input.activeJob.agent_status === "pending") {
    return "Agent review queued";
  }

  return null;
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
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Public repo scorecards
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Skylos Judge
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Deterministic public grades for security, quality, and dead code. Every scorecard is tied to a pinned commit, a scan date, and a scoring version.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">No request-time scanning</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Pinned commit snapshots</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Static score, not LLM-graded</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        {repos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">Judge is wired, but no snapshots are imported yet.</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Seed the first repos, scan them out of band, then POST the results into the Judge import route. Starting set:
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {DEFAULT_JUDGE_SEED_REPOS.map((repo) => (
                <div key={repo.sourceUrl} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm font-semibold text-slate-900">{repo.owner}/{repo.name}</div>
                  <div className="mt-2 text-sm text-slate-500">{repo.language}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {repos.map(({ repo, latestSnapshot, latestAgentSnapshot, activeJob }) => {
              const queuedStatus = statusCopy(activeJob);
              const pipelineCopy = analysisCopy({
                hasAgentSnapshot: Boolean(latestAgentSnapshot),
                activeJob,
              });

              return (
                <Link
                  key={`${repo.owner}/${repo.name}`}
                  href={`/judge/${repo.owner}/${repo.name}`}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{repo.language || "unknown"}</div>
                      <h2 className="mt-2 text-2xl font-bold text-slate-950">{repo.owner}/{repo.name}</h2>
                    </div>
                    {latestSnapshot ? (
                      <div className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-white">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">Grade</div>
                        <div className="mt-1 text-2xl font-black">{latestSnapshot.grade}</div>
                        <div className="text-sm font-semibold text-slate-200">{latestSnapshot.overall_score}</div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-amber-900">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em]">Status</div>
                        <div className="mt-1 text-sm font-semibold">{queuedStatus || "Unscanned"}</div>
                      </div>
                    )}
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
                          <span>Scanned {new Date(latestSnapshot.scanned_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                        {pipelineCopy ? (
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {pipelineCopy}
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                      <TimerReset className="h-4 w-4" />
                      <span>{queuedStatus || "Waiting for first import."}</span>
                    </div>
                  )}

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    View scorecard
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section id="suggest-repo" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <SuggestJudgeRepoForm />

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-2xl font-bold text-slate-950">How future libraries get added</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                Judge is not a manual upload tool. Future libraries enter through a queue: repo suggestion, review, worker execution, then immutable snapshot import.
              </p>
              <p>
                The intended execution path is:
                <br />
                1. Suggest repo
                <br />
                2. Approve suggestion
                <br />
                3. Run Skylos static on a pinned commit
                <br />
                4. Optionally run Skylos agent
                <br />
                5. Import snapshots and publish the scorecard
              </p>
              <p>
                Public grades are tied to the static snapshot. Agent output is tracked separately so it can deepen the analysis later without making the grade feel arbitrary.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
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
