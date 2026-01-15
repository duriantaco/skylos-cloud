type Pull = { number: number };

type PullFile = {
  filename: string;
  patch?: string;
};

function parseRepoPath(repoUrl: string): string | null {
  if (!repoUrl) return null;
  // supports https://github.com/owner/repo or .../repo.git
  const m = String(repoUrl).match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/i);
  return m?.[1] ?? null;
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
  // preview header is still commonly used for this endpoint
  const prs = await ghJson<Pull[]>(url, token, {
    headers: { Accept: "application/vnd.github+json, application/vnd.github.groot-preview+json" },
  });
  return prs?.[0]?.number ?? null;
}

// PR files (includes "patch" text)
async function listPrFiles(repoPath: string, prNumber: number, token: string): Promise<PullFile[]> {
  const out: PullFile[] = [];
  let page = 1;

  while (page <= 20) {
    const url = `https://api.github.com/repos/${repoPath}/pulls/${prNumber}/files?per_page=100&page=${page}`;
    const batch = await ghJson<PullFile[]>(url, token);
    if (!batch?.length) break;
    out.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return out;
}

// parse unified diff "patch" into changed line numbers in the new file
function changedLinesFromPatch(patch: string): Set<number> {
  const changed = new Set<number>();
  const lines = patch.split("\n");

  let newLine = 0;

  for (const raw of lines) {
    const m = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (m) {
      newLine = parseInt(m[1], 10);
      continue;
    }
    if (newLine === 0) 
        continue; 

    // ignore file headers inside patch
    if (raw.startsWith("+++ ") || raw.startsWith("--- ")) continue;

    if (raw.startsWith("+")) {
      changed.add(newLine);
      newLine += 1;
    } else if (raw.startsWith(" ")) {
      newLine += 1;
    } else if (raw.startsWith("-")) {
    } else if (raw.startsWith("\\ No newline")) {
      // ignore
    }
  }

  return changed;
}

function normPath(p: string) {
  return String(p || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

export type DiffScope = {
  repoPath: string;
  prNumber: number;

  baseRef: string;
  baseSha: string;
  headSha: string;

  changedFiles: Set<string>;
  changedLinesMap: Map<string, Set<number>>;
  filesMissingPatch: Set<string>;
};

type PullDetail = {
  number: number;
  base: { ref: string; sha: string };
  head: { sha: string };
};

async function getPullDetail(repoPath: string, prNumber: number, token: string): Promise<PullDetail> {
  const url = `https://api.github.com/repos/${repoPath}/pulls/${prNumber}`;
  return ghJson<PullDetail>(url, token);
}

export async function getDiffScopeForCommit(args: {
  repoUrl: string | null;
  sha: string | null;
}): Promise<DiffScope | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) 
    return null;
  if (!args.repoUrl || !args.sha) 
    return null;
  if (args.sha === "local") 
    return null;

  const repoPath = parseRepoPath(args.repoUrl);
  if (!repoPath) 
    return null;

  const prNumber = await findAssociatedPrNumber(repoPath, args.sha, token);
  if (!prNumber) 
    return null;

  const pr = await getPullDetail(repoPath, prNumber, token);
  const files = await listPrFiles(repoPath, prNumber, token);

  const changedFiles = new Set<string>();
  const changedLinesMap = new Map<string, Set<number>>();
  const filesMissingPatch = new Set<string>();

  for (const f of files) {
    const name = normPath(f.filename);
    changedFiles.add(name);

    if (f.patch) {
      changedLinesMap.set(name, changedLinesFromPatch(f.patch));
    } else {
      filesMissingPatch.add(name);
    }
  }

  return { 
    repoPath, 
    prNumber, 
    baseRef: pr.base.ref,
    baseSha: pr.base.sha,
    headSha: pr.head.sha, 
    changedFiles, 
    changedLinesMap, 
    filesMissingPatch 
  };
}

export function isNewByDiff(args: {
  filePath: string;
  lineNumber: number;
  scope: DiffScope | null;
}): boolean {
  if (!args.scope) return false;

  const file = normPath(args.filePath);
  const line = Number(args.lineNumber || 0) || 0;

  const lineSet = args.scope.changedLinesMap.get(file);
  if (lineSet) return lineSet.has(line);

  return args.scope.changedFiles.has(file);
}
