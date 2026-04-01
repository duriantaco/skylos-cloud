"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";

type FormState =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function isValidGitHubUrl(value: string): boolean {
  return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i.test(value.trim());
}

export default function SuggestJudgeRepoForm() {
  const [repoUrl, setRepoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [includeAgent, setIncludeAgent] = useState(true);
  const [state, setState] = useState<FormState>({ type: "idle" });
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ type: "idle" });

    if (!isValidGitHubUrl(repoUrl)) {
      setState({
        type: "error",
        message: "Use a public GitHub repository URL like https://github.com/owner/repo",
      });
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/judge/suggestions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          repo_url: repoUrl,
          contact_email: contactEmail,
          notes,
          requested_analysis_modes: includeAgent ? ["static", "agent"] : ["static"],
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setState({
          type: "error",
          message: data.error || "Failed to submit repo suggestion",
        });
        return;
      }

      setState({
        type: "success",
        message:
          data.message ||
          "Repo suggestion received. We will review it for Judge.",
      });
      setRepoUrl("");
      setContactEmail("");
      setNotes("");
      setIncludeAgent(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-slate-950">Suggest a repo for Judge</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Users do not manually upload grades. They suggest a public GitHub repo, we queue it, and the Judge worker runs Skylos static first and optionally Skylos agent as a second pass.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block">
          <div className="text-sm font-semibold text-slate-900">GitHub repo URL</div>
          <input
            type="url"
            inputMode="url"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/owner/repo"
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-slate-900">Email for follow-up (optional)</div>
          <input
            type="email"
            inputMode="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="you@company.com"
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </label>
      </div>

      <label className="mt-5 block">
        <div className="text-sm font-semibold text-slate-900">Why this repo?</div>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          placeholder="Optional context: widely used library, interesting benchmark repo, your team maintains it, etc."
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
        />
      </label>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">Requested analyses</div>
        <div className="mt-3 flex flex-col gap-3 text-sm text-slate-600">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked readOnly className="mt-0.5 h-4 w-4 rounded border-slate-300" />
            <span>
              <strong className="text-slate-900">Skylos static</strong>
              <br />
              Required for the public Judge grade.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={includeAgent}
              onChange={(event) => setIncludeAgent(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              <strong className="text-slate-900">Skylos agent</strong>
              <br />
              Optional second pass for richer explanations and future queue support.
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Submitting..." : "Suggest repo"}
        </button>
        <div className="text-xs text-slate-500">
          Queue model only. No public score is created until the worker runs.
        </div>
      </div>

      {state.type !== "idle" && (
        <div
          className={`mt-5 rounded-2xl p-4 text-sm ${
            state.type === "success"
              ? "bg-emerald-50 text-emerald-950"
              : "bg-rose-50 text-rose-950"
          }`}
        >
          {state.message}
        </div>
      )}
    </form>
  );
}
