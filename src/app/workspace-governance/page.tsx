import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  ArrowRight,
  Check,
  FileCheck2,
  GitBranch,
  Layers3,
  Shield,
  ShieldCheck,
  Terminal,
  Users,
  Workflow,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Workspace Governance v1 | Skylos",
  description:
    "Set one security baseline across every repo. Allow controlled project overrides. Keep exceptions and evidence in one place.",
};

const governancePillars = [
  {
    title: "One baseline across repos",
    body: "Define the default analysis policy once at the workspace level so every inheriting project starts from the same standard.",
    icon: Layers3,
  },
  {
    title: "Controlled project overrides",
    body: "Projects can deliberately diverge when they need to, with an explicit inherit-or-override model instead of hidden per-repo drift.",
    icon: GitBranch,
  },
  {
    title: "Exception trail and evidence",
    body: "Route recurring issue suppressions through review, keep a decision trail, and export proof from the same web surface.",
    icon: FileCheck2,
  },
];

const buyerSignals = [
  "You have 2+ repos and do not want repo-by-repo policy drift.",
  "You have 2+ contributors and need one visible standard.",
  "You are shipping AI-assisted code and want review controls around it.",
  "You need a web audit trail for overrides, exceptions, and evidence exports.",
];

const freeVsPaid = [
  {
    heading: "Free",
    title: "Local CLI and basic scanning",
    bullets: [
      "Run Skylos locally with no login",
      "Scan one repo and decide whether the signal is worth keeping",
      "Add CI later with skylos cicd init when the results earn trust",
    ],
  },
  {
    heading: "Paid",
    title: "Workspace Governance",
    bullets: [
      "Set one baseline across every repo",
      "Allow controlled project overrides",
      "Keep exceptions and evidence in one place",
      "Use the web app for shared history, review, and governance workflows",
    ],
  },
];

const creditsExamples = [
  "Uploads and shared scan history",
  "Compare and trend computation",
  "AI-assisted actions like triage or remediation",
];

export default function WorkspaceGovernancePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-24">
        <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.05),_transparent_45%),linear-gradient(to_bottom,_white,_#f8fafc)]">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Workspace Governance v1
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
                Set one security baseline across every repo.
              </h1>
              <p className="mt-6 max-w-3xl text-xl leading-relaxed text-slate-600">
                Allow controlled project overrides. Keep exceptions and evidence in one place.
                Skylos stays free for local CLI scanning. The paid web layer is for teams that need
                one standard across multiple repos and contributors.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
                >
                  Unlock Workspace Governance
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/scan"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Run the free CLI first
                  <Terminal className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {governancePillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-slate-900">{pillar.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{pillar.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr,1fr]">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Who it is for
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                The buyer is not “everyone running a scanner.”
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
                Workspace Governance is for teams that have moved beyond one developer on one repo.
                If policy drift, reviewer decisions, and evidence collection are starting to spread
                across multiple repos or people, this is the part worth paying for.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Users className="h-4 w-4 text-slate-500" />
                Strong fit when
              </div>
              <div className="space-y-3">
                {buyerSignals.map((signal) => (
                  <div key={signal} className="flex items-start gap-3 rounded-2xl bg-white p-4">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p className="text-sm text-slate-700">{signal}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Free vs Paid
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Sell the control layer, not the billing mechanics.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Credits still exist in Skylos, but they should feel like infrastructure billing.
                The product people pay for is the shared governance layer in the web app.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {freeVsPaid.map((column) => (
                <div key={column.title} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {column.heading}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-slate-900">{column.title}</h3>
                  <div className="mt-6 space-y-3">
                    {column.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <p className="text-sm text-slate-700">{bullet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1fr,1.1fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Workflow className="h-4 w-4 text-slate-500" />
                What the purchase actually unlocks
              </div>
              <div className="mt-6 space-y-4">
                {[
                  "Workspace baseline policy",
                  "Project inheritance and override workflow",
                  "Exception queue and reviewer decisions",
                  "Evidence export and audit-friendly history",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-white p-4">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p className="text-sm text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                How credits fit
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Credits should be background mechanics, not the headline value prop.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Your first completed purchase unlocks permanent Workspace Governance. Credits are
                then spent only on compute-heavy cloud actions.
              </p>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Shield className="h-4 w-4 text-slate-500" />
                  Credits are used for
                </div>
                <div className="mt-4 space-y-3">
                  {creditsExamples.map((example) => (
                    <div key={example} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <p className="text-sm text-slate-700">{example}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm text-slate-500">
                  No seat tax. No recurring “buy access again” step. Credits never expire.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Start free, then unlock the shared layer when it is useful
            </div>
            <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
              Run Skylos on one repo first. Pay when governance becomes the problem.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              That is the product line: free local signal first, paid web governance second.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/scan"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Run the free CLI first
                <Terminal className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                Unlock Workspace Governance
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
