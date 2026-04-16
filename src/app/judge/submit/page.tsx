import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Bot, FileJson, ShieldCheck, UploadCloud } from "lucide-react";
import JudgeImportForm from "@/components/judge/JudgeImportForm";

export const metadata: Metadata = {
  title: "Judge Submit",
  description:
    "Run Skylos on a pinned commit, then import the static public grade and optional AI review into Skylos Judge.",
  alternates: {
    canonical: "/judge/submit",
  },
};

type SubmitPageProps = {
  searchParams: Promise<{
    owner?: string | string[];
    repo?: string | string[];
    source_url?: string | string[];
    branch?: string | string[];
  }>;
};

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default async function JudgeSubmitPage({ searchParams }: SubmitPageProps) {
  const params = await searchParams;
  const initialOwner = readParam(params.owner);
  const initialRepo = readParam(params.repo);
  const initialSourceUrl = readParam(params.source_url);
  const initialBranch = readParam(params.branch) || "main";

  const staticCommand = [
    "git clone https://github.com/OWNER/REPO",
    "cd REPO",
    "git checkout <commit-sha>",
    "skylos . --danger --secrets --quality --json -o judge-static.json",
  ].join("\n");

  const agentCommand = [
    "# Optional second pass",
    "# Use Skylos defend or another AI review tool that can export JSON",
    "git checkout <same-commit-sha>",
    "skylos defend . --json -o judge-agent.json",
  ].join("\n");

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <Link
            href="/judge"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to Judge
          </Link>

          <div className="mt-6 max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              <UploadCloud className="h-4 w-4" />
              Operator submit path
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Run and import a Judge snapshot properly
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Judge needs two visible lanes: a public scorecard lane and an operator import lane. This page is the operator lane.
              Run a pinned static scan to publish the public grade, then optionally attach an AI review as a second pass.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <LaneCard
              icon={ShieldCheck}
              title="Public grade"
              description="Static, deterministic, and tied to one pinned commit. This is the score users see on the public Judge page."
            />
            <LaneCard
              icon={Bot}
              title="AI review"
              description="Optional second pass for richer context. It is stored separately so Judge never feels like an arbitrary LLM grade."
            />
            <LaneCard
              icon={FileJson}
              title="Import route"
              description="This page posts to the existing admin import endpoint so you can stop guessing how to upload a snapshot."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <InfoCard
              eyebrow="Step 1"
              title="Run the deterministic public-grade pass"
              description="Always pin the commit first. The public Judge grade should come from a reproducible static run, not from an AI pass."
              code={staticCommand}
            />

            <InfoCard
              eyebrow="Step 2"
              title="Optionally add an AI review"
              description="If you want a second pass, import it as `agent`. That gives you an AI review trail without rewriting the public score."
              code={agentCommand}
            />
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">Accepted report inputs</h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <p>
                  <strong className="text-slate-900">Skylos JSON</strong>: output from <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">skylos . --json</code>.
                </p>
                <p>
                  <strong className="text-slate-900">SARIF</strong>: any SARIF payload Judge can normalize into security, quality, secret, and dead-code findings.
                </p>
                <p>
                  <strong className="text-slate-900">Skylos defend JSON</strong>: valid for the optional AI review path.
                </p>
                <p>
                  <strong className="text-slate-900">Claude Code Security JSON</strong> or another normalized <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">summary/findings</code> payload.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-bold text-slate-950">What this fixes for users</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>
                  The public Judge pages now explain what affects the score and what does not. The public grade is static. The AI review is separate.
                </p>
                <p>
                  This page gives operators a concrete place to import snapshots instead of hiding everything behind docs and an admin-only API contract.
                </p>
                <p>
                  When you are importing for an existing repo page, open this route with query params like{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">/judge/submit?owner=psf&amp;repo=black</code> to prefill the form.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <JudgeImportForm
          initialOwner={initialOwner}
          initialRepo={initialRepo}
          initialSourceUrl={initialSourceUrl}
          initialBranch={initialBranch}
        />
      </section>
    </main>
  );
}

function LaneCard({
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

function InfoCard({
  eyebrow,
  title,
  description,
  code,
}: {
  eyebrow: string;
  title: string;
  description: string;
  code: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</div>
      <h2 className="mt-3 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      <pre className="mt-5 overflow-x-auto rounded-3xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
