import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";


if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

type Plan = "free" | "pro" | "enterprise";

function isPaid(plan: string) {
  const p = String(plan || "free").toLowerCase();
  return p === "pro" || p === "enterprise";
}

function parseRepo(repoUrl: string) {
  const m = String(repoUrl || "").match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function ghJson(url: string, token?: string) {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(url, { headers, cache: "no-store" });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`GitHub API error ${r.status}: ${txt}`);
  }
  return r.json();
}

async function fetchRepoTree(args: { owner: string; repo: string; sha: string; token?: string }) {
  const url = `https://api.github.com/repos/${args.owner}/${args.repo}/git/trees/${args.sha}?recursive=1`;
  return ghJson(url, args.token);
}

async function fetchFileContent(args: { owner: string; repo: string; path: string; ref: string; token?: string }) {
  const url = `https://api.github.com/repos/${args.owner}/${args.repo}/contents/${encodeURIComponent(args.path)}?ref=${args.ref}`;
  const data = await ghJson(url, args.token);

  if (!data?.content || data?.encoding !== "base64") return null;
  const raw = Buffer.from(String(data.content).replace(/\n/g, ""), "base64").toString("utf-8");
  return raw;
}

function findContainingFunction(src: string, lineNumber: number) {
  const lines = src.split("\n");
  const target = Math.max(1, Math.floor(lineNumber || 1));
  let fn = null;

  for (let i = Math.min(lines.length, target) - 1; i >= 0; i--) {
    const line = lines[i];
    const m = line.match(/^\s*def\s+([A-Za-z_]\w*)\s*\(/);
    if (m) {
      fn = m[1];
      break;
    }
  }
  return fn;
}

function extractEntrypoints(src: string) {
  const lines = src.split("\n");
  const entryFns: string[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const dec = lines[i].trim();
    if (!dec.startsWith("@")) 
        continue;

    const isHttp =
      /@(app|router)\.(get|post|put|delete|patch)\b/i.test(dec) ||
      /@.*route\(/i.test(dec);

    if (!isHttp) continue;

    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const l2 = lines[j];
      const m2 = l2.match(/^\s*def\s+([A-Za-z_]\w*)\s*\(/);
      if (m2) {
        entryFns.push(m2[1]);
        break;
      }
      if (l2.trim() && !l2.trim().startsWith("@")) 
        break;
    }
  }

  return entryFns;
}

function extractFunctionBodies(src: string) {
  const lines = src.split("\n");

  const funcs: Record<string, string[]> = {};
  let current: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*def\s+([A-Za-z_]\w*)\s*\(/);
    if (m) {
      current = m[1];
      funcs[current] = [lines[i]];
      continue;
    }
    if (current) funcs[current].push(lines[i]);
  }

  return funcs; // name -> lines
}

function extractCalls(fnLines: string[]) {
  const text = fnLines.join("\n");

  const calls = new Set<string>();
  const re = /([A-Za-z_]\w*)\s*\(/g;

  let m;
  while ((m = re.exec(text))) {
    const name = m[1];
    if (!name) 
        continue;
    if (["def", "if", "for", "while", "return", "print"].includes(name)) 
        continue;
    calls.add(name);
  }
  return Array.from(calls);
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing token", code: "NO_TOKEN" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    const { data: project, error: projError } = await supabase
      .from("projects")
      .select(`
        id, name, repo_url, github_token,
        organizations(plan)
      `)
      .eq("api_key", token)
      .single();

    if (projError || !project) {
      return NextResponse.json(
        { error: "Invalid token", code: "INVALID_TOKEN" },
        { status: 403 }
      );
    }

    const orgRef: any = (project as any).organizations;
    const plan = String((Array.isArray(orgRef) ? orgRef?.[0]?.plan : orgRef?.plan) || "free");

    if (!isPaid(plan)) {
      return NextResponse.json(
        {
          error: "Verify is a Pro feature",
          code: "PLAN_REQUIRED",
          plan,
          upgrade_url: "/dashboard/settings?upgrade=true",
        },
        { status: 402 }
      );
    }

    const body = await req.json();
    const findings = Array.isArray(body?.findings) ? body.findings : [];
    const commit_hash = String(body?.commit_hash || "main");
    const scan_id = String(body?.scan_id || "");
    const repoUrl = String(project.repo_url || "");
    const repo = parseRepo(repoUrl);

    if (!repo) {
      return NextResponse.json(
        { error: "Invalid repo_url on project", code: "BAD_REPO_URL" },
        { status: 400 }
      );
    }

    const ghToken = String(project.github_token || process.env.GITHUB_TOKEN || "");

    const tree = await fetchRepoTree({
      owner: repo.owner,
      repo: repo.repo,
      sha: commit_hash,
      token: ghToken,
    });

    const blobs = Array.isArray(tree?.tree) ? tree.tree : [];
    const pyFiles = blobs
      .filter((x: any) => x?.type === "blob" && typeof x?.path === "string" && x.path.endsWith(".py"))
      .slice(0, 250);

    const fileMap: Record<string, string> = {};
    for (const f of pyFiles.slice(0, 80)) {
      try {
        const content = await fetchFileContent({
          owner: repo.owner,
          repo: repo.repo,
          path: f.path,
          ref: commit_hash,
          token: ghToken,
        });
        if (content) fileMap[f.path] = content;
      } catch {
      }
    }

    const entryFns = new Set<string>();
    const edges: Record<string, string[]> = {};
    const fnFile: Record<string, string> = {};

    for (const [path, src] of Object.entries(fileMap)) {
      for (const ep of extractEntrypoints(src)) entryFns.add(ep);

      const funcs = extractFunctionBodies(src);
      for (const [fn, lines] of Object.entries(funcs)) {
        fnFile[fn] = path;
        const calls = extractCalls(lines);
        edges[fn] = calls;
      }
    }

    const reachable = new Set<string>();
    const parent: Record<string, string | null> = {};
    const q: string[] = [];

    for (const ep of entryFns) {
      reachable.add(ep);
      parent[ep] = null;
      q.push(ep);
    }

    while (q.length) {
      const cur = q.shift()!;
      const next = edges[cur] || [];
      for (const nxt of next) {
        if (reachable.has(nxt)) 
            continue;
        reachable.add(nxt);
        parent[nxt] = cur;
        q.push(nxt);
      }
    }

    function buildChain(fn: string) {
      const chain: { fn: string; file?: string }[] = [];
      let cur: string | null = fn;
      let guard = 0;

      while (cur && guard++ < 50) {
        chain.push({ fn: cur, file: fnFile[cur] });
        cur = parent[cur] ?? null;
      }

      return chain.reverse();
    }

    const results = findings.slice(0, 200).map((f: any) => {
        const file_path = String(f.file_path || f.file || "");
        const line_number = Number(f.line_number || f.line || 1);

        const finding_id = String(
            f.finding_id || `${f.rule_id}::${file_path}::${line_number}`
        );

        const src = fileMap[file_path] || null;
        if (!src) {
            return {
            finding_id,   
            rule_id: f.rule_id,
            file_path,
            line_number,
            verdict: "UNKNOWN",
            reason: "File not fetched from GitHub (private repo or missing token).",
            evidence: null,
        };
      }

      const fn = findContainingFunction(src, line_number);
      if (!fn) {
        return {
            finding_id,
            rule_id: f.rule_id,
            file_path,
            line_number,
            verdict: "UNKNOWN",
            reason: "Could not locate containing function.",
            evidence: null,
        };
      }

      const isReachable = reachable.has(fn);

        return {
            finding_id,
            rule_id: f.rule_id,
            file_path,
            line_number,
            containing_function: fn,
            verdict: isReachable ? "VERIFIED" : "REFUTED",
            reason: isReachable
            ? "Reachable from an HTTP entrypoint (static callgraph)."
            : "Not reachable from any detected entrypoint (static callgraph).",
            evidence: isReachable
            ? { chain: buildChain(fn) }
            : { entrypoints: Array.from(entryFns).slice(0, 20) },
        };
    });

    if (scan_id) {
        try {
            for (const r of results) {
            await supabase
                .from("findings")
                .update({
                verification_verdict: r.verdict,
                verification_reason: r.reason,
                verification_evidence: r.evidence,
                verified_at: new Date().toISOString(),
                })
                .eq("scan_id", scan_id)
                .eq("finding_id", r.finding_id);
            }
        } catch {
    }}

    return NextResponse.json({
        ok: true,
        plan,
        commit_hash,
        scan_id: scan_id || null,
        verified_count: results.filter((r: any) => r.verdict === "VERIFIED").length,
        suppressed_count: results.filter((r: any) => r.verdict === "REFUTED").length,
        unknown_count: results.filter((r: any) => r.verdict === "UNKNOWN").length,
        results,
    });

  } catch (e: any) {
    return serverError(e, "Verify API");
  }
}
