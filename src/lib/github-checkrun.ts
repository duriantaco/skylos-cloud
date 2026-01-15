import { getDiffScopeForCommit } from "@/lib/github-pr-diff";

type FindingLike = {
  rule_id: string;
  file_path: string;
  line_number: number;
  message: string;
  severity?: string;
  category?: string;
  snippet?: string | null;
  is_new?: boolean;
  is_suppressed?: boolean;
  new_reason?: "pr-changed-line" | "pr-file-fallback" | "legacy" | "non-pr"; 
};

type CheckRunDiffScope = {
  prNumber: number;
  baseRef: string;
  baseSha: string;
  headSha: string;
  filesMissingPatch: string[];
  changedFilesCount: number;
};

function normPath(p: string) {
  return String(p || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function parseRepoPath(repoUrl: string): string | null {
  if (!repoUrl) return null;
  const m = repoUrl.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/i);
  return m?.[1] ?? null;
}

function sevToLevel(sev?: string): "failure" | "warning" | "notice" {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL" || s === "HIGH") 
    return "failure";
  if (s === "MEDIUM") 
    return "warning";
  return "notice";
}

async function ghJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...(init || {}),
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${txt || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function findAssociatedPrNumber(repoPath: string, sha: string, token: string): Promise<number | null> {
  const url = `https://api.github.com/repos/${repoPath}/commits/${sha}/pulls`;
  const prs = await ghJson<any[]>(url, token, {
    headers: { Accept: "application/vnd.github+json, application/vnd.github.groot-preview+json" },
  });
  return prs?.[0]?.number ?? null;
}

async function listPrFiles(repoPath: string, prNumber: number, token: string): Promise<Set<string>> {
  const files = new Set<string>();
  let page = 1;

  while (page <= 10) {
    const url = `https://api.github.com/repos/${repoPath}/pulls/${prNumber}/files?per_page=100&page=${page}`;
    const batch = await ghJson<any[]>(url, token);
    if (!batch?.length) break;
    for (const f of batch) {
      if (f?.filename) files.add(String(f.filename));
    }
    if (batch.length < 100) break;
    page += 1;
  }

  return files;
}

export async function postSkylosCheckRun(args: {
  repoUrl: string | null;
  sha: string;
  scanId: string;
  appBaseUrl: string;
  passedGate: boolean;
  findings: FindingLike[];
  diffScope?: CheckRunDiffScope | null;
}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) 
    return;
  if (!args.repoUrl) 
    return;

  const repoPath = parseRepoPath(args.repoUrl);
  if (!repoPath) 
    return;
  if (!args.sha || args.sha === "local") 
    return;

  let prNumber: number | null = null;
  let baseRef: string | null = null;
  let baseSha: string | null = null;
  let headSha: string | null = null;
  let changedFilesCount = 0;
  let missingPatchCount = 0;

  try {
    const scope = await getDiffScopeForCommit({ repoUrl: args.repoUrl, sha: args.sha });
    if (scope) {
      prNumber = scope.prNumber;
      changedFilesCount = scope.changedFiles.size;
      missingPatchCount = scope.filesMissingPatch.size;

      const pr = await ghJson<any>(
        `https://api.github.com/repos/${scope.repoPath}/pulls/${scope.prNumber}`,
        token
      );

      baseRef = pr?.base?.ref ?? null;
      baseSha = pr?.base?.sha ?? null;
      headSha = pr?.head?.sha ?? null;
    }
  } catch (e) {
  }

  const candidate = args.findings.filter(f => f.is_new && !f.is_suppressed);

  const filtered = candidate;

  const detailsUrl = `${args.appBaseUrl.replace(/\/$/, "")}/dashboard/scans/${args.scanId}`;

  const MAX_ANN = 50;
  const annotations = filtered.slice(0, MAX_ANN).map(f => {
    // for now keep under limits
    const raw = (f.snippet || "").slice(0, 60000);
    const line = Number(f.line_number || 1) || 1;
    return {
      path: normPath(String(f.file_path || "")),
      start_line: line,
      end_line: line,
      annotation_level: sevToLevel(f.severity),
      title: `${f.rule_id}${f.category ? ` • ${f.category}` : ""}`,
      message: `${String(f.message || "Issue")}${f.new_reason ? ` [scope:${f.new_reason}]` : ""}`,
      raw_details: raw || undefined,
    };
  });

  const omitted = Math.max(0, filtered.length - annotations.length);

  const conclusion = args.passedGate ? "success" : "failure";
    const byLine = filtered.filter(f => f.new_reason === "pr-changed-line").length;
  const byFile = filtered.filter(f => f.new_reason === "pr-file-fallback").length;

  const ctxLines: string[] = [];
  if (prNumber && baseRef && baseSha && headSha) {
    ctxLines.push(`**PR:** #${prNumber}`);
    ctxLines.push(`**Range:** ${baseRef}@${baseSha.slice(0,7)} → ${headSha.slice(0,7)}`);
    ctxLines.push(
      `**Scope:** changed-lines` +
      (missingPatchCount > 0 ? ` (fallback-to-file for ${missingPatchCount} file(s) without patch)` : "")
    );
    ctxLines.push(`**Files changed:** ${changedFilesCount}`);
  } else {
    ctxLines.push(`**PR:** (not detected from sha)`);
    ctxLines.push(`**Scope:** (no diff context; showing all is_new findings)`);
  }

  const summary =
    `**New unsuppressed issues (PR gate):** ${filtered.length}\n` +
    (prNumber ? `- changed-line hits: ${byLine}\n- file-fallback hits: ${byFile}\n` : "") +
    `\n` +
    ctxLines.join("\n") +
    `\n\n` +
    (omitted > 0 ? `Showing first ${annotations.length}. ${omitted} more omitted.\n\n` : "\n") +
    `Open full details: ${detailsUrl}`;

  const body = {
    name: "Skylos Gate",
    head_sha: args.sha,
    status: "completed",
    conclusion,
    details_url: detailsUrl,
    output: {
      title: args.passedGate ? "Quality Gate Passed" : "Quality Gate Failed",
      summary,
      annotations,
    },
  };

  await ghJson(`https://api.github.com/repos/${repoPath}/check-runs`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
