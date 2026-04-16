"use client";

import Link from "next/link";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, FileJson, UploadCloud } from "lucide-react";

type JudgeImportFormProps = {
  initialOwner?: string;
  initialRepo?: string;
  initialSourceUrl?: string;
  initialBranch?: string;
};

type FormState =
  | { type: "idle" }
  | { type: "success"; message: string; href: string }
  | { type: "error"; message: string };

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildJudgeHref(owner: string, repo: string): string {
  return `/judge/${owner.trim().toLowerCase()}/${repo.trim().toLowerCase()}`;
}

export default function JudgeImportForm({
  initialOwner = "",
  initialRepo = "",
  initialSourceUrl = "",
  initialBranch = "main",
}: JudgeImportFormProps) {
  const [adminToken, setAdminToken] = useState("");
  const [owner, setOwner] = useState(initialOwner);
  const [repo, setRepo] = useState(initialRepo);
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl);
  const [defaultBranch, setDefaultBranch] = useState(initialBranch);
  const [language, setLanguage] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [branch, setBranch] = useState(initialBranch);
  const [analysisKind, setAnalysisKind] = useState<"static" | "agent">("static");
  const [confidenceScore, setConfidenceScore] = useState("100");
  const [skylosVersion, setSkylosVersion] = useState("");
  const [analysisMode, setAnalysisMode] = useState("");
  const [jobId, setJobId] = useState("");
  const [fairnessNotes, setFairnessNotes] = useState("");
  const [rawReport, setRawReport] = useState("");
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({ type: "idle" });
  const [isPending, startTransition] = useTransition();

  const targetHref = useMemo(() => {
    if (!owner.trim() || !repo.trim()) return "";
    return buildJudgeHref(owner, repo);
  }, [owner, repo]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setReportFileName(null);
      return;
    }

    const text = await file.text();
    setRawReport(text);
    setReportFileName(file.name);
    setState({ type: "idle" });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ type: "idle" });

    if (!adminToken.trim()) {
      setState({ type: "error", message: "Enter the Judge admin token before importing." });
      return;
    }

    if (!owner.trim() || !repo.trim() || !commitSha.trim()) {
      setState({
        type: "error",
        message: "Repo owner, repo name, and commit SHA are required.",
      });
      return;
    }

    if (!rawReport.trim()) {
      setState({
        type: "error",
        message: "Paste a JSON report or load a JSON file before importing.",
      });
      return;
    }

    let parsedReport: unknown;
    try {
      parsedReport = JSON.parse(rawReport);
    } catch {
      setState({
        type: "error",
        message: "The report payload is not valid JSON.",
      });
      return;
    }

    const parsedConfidence = parseOptionalNumber(confidenceScore);
    if (confidenceScore.trim() && parsedConfidence === null) {
      setState({
        type: "error",
        message: "Confidence score must be a number between 0 and 100.",
      });
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/judge/admin/import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-judge-admin-token": adminToken.trim(),
        },
        body: JSON.stringify({
          repo: {
            owner: owner.trim(),
            name: repo.trim(),
            source_url: sourceUrl.trim() || null,
            default_branch: defaultBranch.trim() || null,
            language: language.trim() || null,
          },
          snapshot: {
            branch: branch.trim() || null,
            commit_sha: commitSha.trim(),
            confidence_score: parsedConfidence,
            skylos_version: skylosVersion.trim() || null,
            analysis_mode: analysisMode.trim() || null,
            analysis_kind: analysisKind,
            job_id: jobId.trim() || null,
            fairness_notes: fairnessNotes
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          },
          report: parsedReport,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        repo?: string;
        grade?: string;
        overall_score?: number;
      };

      if (!response.ok) {
        setState({
          type: "error",
          message: data.error || "Judge import failed.",
        });
        return;
      }

      const href = buildJudgeHref(owner, repo);
      const successMessage =
        analysisKind === "static"
          ? `Imported public grade for ${data.repo || `${owner}/${repo}`}${typeof data.overall_score === "number" ? ` • ${data.grade} / ${data.overall_score}` : ""}.`
          : `Imported optional AI review for ${data.repo || `${owner}/${repo}`}.`;

      setState({
        type: "success",
        message: successMessage,
        href,
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            <UploadCloud className="h-3.5 w-3.5" />
            Judge import console
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">Upload a pinned Judge snapshot</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            This form posts directly to <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">/api/judge/admin/import</code>.
            Static imports publish the public grade. Agent imports attach an optional AI review without changing that public grade.
          </p>
        </div>
        {targetHref ? (
          <Link
            href={targetHref}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Open repo scorecard
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="block">
          <div className="text-sm font-semibold text-slate-900">Judge admin token</div>
          <input
            type="password"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            placeholder="JUDGE_ADMIN_TOKEN"
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-slate-900">Analysis kind</div>
          <select
            value={analysisKind}
            onChange={(event) => setAnalysisKind(event.target.value === "agent" ? "agent" : "static")}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="static">Static public grade</option>
            <option value="agent">Optional AI review</option>
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Repo owner" value={owner} onChange={setOwner} placeholder="psf" />
        <Field label="Repo name" value={repo} onChange={setRepo} placeholder="black" />
        <Field label="Default branch" value={defaultBranch} onChange={setDefaultBranch} placeholder="main" />
        <Field label="Language" value={language} onChange={setLanguage} placeholder="Python" />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Field
          label="Source URL"
          value={sourceUrl}
          onChange={setSourceUrl}
          placeholder="https://github.com/owner/repo"
        />
        <Field
          label="Commit SHA"
          value={commitSha}
          onChange={setCommitSha}
          placeholder="672971d66a2ef9f85151e53283113f33d642dabd"
        />
        <Field label="Branch" value={branch} onChange={setBranch} placeholder="main" />
      </div>

      <details className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Advanced snapshot metadata</summary>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field
            label="Confidence score"
            value={confidenceScore}
            onChange={setConfidenceScore}
            placeholder="100"
          />
          <Field
            label="Skylos version"
            value={skylosVersion}
            onChange={setSkylosVersion}
            placeholder="0.0.x"
          />
          <Field
            label="Analysis mode"
            value={analysisMode}
            onChange={setAnalysisMode}
            placeholder="manual-import"
          />
          <Field label="Job ID" value={jobId} onChange={setJobId} placeholder="optional judge_jobs id" />
        </div>

        <label className="mt-5 block">
          <div className="text-sm font-semibold text-slate-900">Fairness notes</div>
          <textarea
            value={fairnessNotes}
            onChange={(event) => setFairnessNotes(event.target.value)}
            rows={4}
            placeholder="One note per line. Use this when a snapshot needs caveats or scope reminders."
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </label>
      </details>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <label className="block">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Report payload</div>
            <div className="text-xs text-slate-500">
              Accepts Skylos JSON, SARIF, Claude Code Security JSON, or normalized <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">summary/findings</code>.
            </div>
          </div>
          <textarea
            value={rawReport}
            onChange={(event) => setRawReport(event.target.value)}
            rows={18}
            spellCheck={false}
            placeholder='{"summary": {...}, "findings": [...]}'
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-slate-100 outline-none transition focus:border-slate-500"
          />
        </label>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileJson className="h-4 w-4" />
              Load a JSON file
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Drop in a saved Skylos JSON, SARIF file, Claude Code Security report, or another normalized payload. The file contents will populate the import box on the left.
            </p>
            <input
              type="file"
              accept=".json,.sarif,.txt,application/json"
              onChange={handleFileChange}
              className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
            />
            {reportFileName ? (
              <div className="mt-3 text-xs font-medium text-slate-500">Loaded {reportFileName}</div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">What gets published</div>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">Static public grade</div>
                <p className="mt-2 leading-6">Creates or updates the public Judge scorecard that users see on the repo page.</p>
              </div>
              <div className="rounded-2xl bg-violet-50 p-4">
                <div className="font-semibold text-violet-950">Optional AI review</div>
                <p className="mt-2 leading-6 text-violet-900">
                  Stores a second pass for richer context. It is visible as AI review metadata, but it does not rewrite the public grade.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? analysisKind === "static"
              ? "Importing public grade..."
              : "Importing AI review..."
            : analysisKind === "static"
            ? "Import static public grade"
            : "Import AI review"}
        </button>
        <div className="text-xs text-slate-500">
          This is an operator surface. The token is used only for this request and is not stored in the page state beyond the current session.
        </div>
      </div>

      {state.type !== "idle" ? (
        <div
          className={`mt-5 rounded-2xl p-4 text-sm ${
            state.type === "success" ? "bg-emerald-50 text-emerald-950" : "bg-rose-50 text-rose-950"
          }`}
        >
          <div className="flex items-start gap-3">
            {state.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
            <div>
              <div>{state.message}</div>
              {state.type === "success" ? (
                <div className="mt-2">
                  <Link href={state.href} className="font-semibold underline underline-offset-2">
                    Open the scorecard
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
      />
    </label>
  );
}
