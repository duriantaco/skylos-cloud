import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getInstallationOctokit } from "@/lib/github-app";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { parseGitHubRepoUrl, resolveGitHubDefaultBranch } from "@/lib/github-repo";

type ScanProjectRef = {
  repo_url?: string | null;
  github_installation_id?: number | null;
  org_id?: string | null;
};

function normalizeScanFilePath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!normalized) {
    return null;
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "." || segment === ".." || segment.length === 0)) {
    return null;
  }

  return normalized;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const normalizedPath = path ? normalizeScanFilePath(path) : null;
  if (!normalizedPath) {
    return NextResponse.json({ error: "Missing or invalid path" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: scan, error: sErr } = await supabase
    .from("scans")
    .select("id, commit_hash, branch, project_id, projects(repo_url, github_installation_id, org_id)")
    .eq("id", id)
    .single();

  if (sErr || !scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  const projectRelation = scan.projects as ScanProjectRef | ScanProjectRef[] | null;
  const proj = Array.isArray(projectRelation) ? projectRelation[0] : projectRelation;
  const orgId = typeof proj?.org_id === "string" ? proj.org_id : undefined;
  const auth = await requirePermission(supabase, "view:findings", orgId);
  if (isAuthError(auth)) return auth;

  const { count, error: findingError } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("scan_id", id)
    .eq("file_path", normalizedPath);

  if (findingError) {
    return NextResponse.json({ error: "Failed to validate file access" }, { status: 500 });
  }

  if (!count) {
    return NextResponse.json({ error: "File not available for this scan" }, { status: 404 });
  }

  const repo = parseGitHubRepoUrl(proj?.repo_url);
  if (!repo) return NextResponse.json({ error: "Invalid repo_url" }, { status: 400 });

  const installationId = proj?.github_installation_id;
  if (!installationId) return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });

  const octokit = await getInstallationOctokit(installationId);
  const ref =
    (scan.commit_hash && scan.commit_hash !== "local" ? scan.commit_hash : null) ||
    scan.branch ||
    (await resolveGitHubDefaultBranch(proj?.repo_url, installationId).catch(() => null)) ||
    "main";

  const res = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
    owner: repo.owner,
    repo: repo.repo,
    path: normalizedPath,
    ref,
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  });

  const data = Array.isArray(res.data)
    ? null
    : (res.data as { content?: string; encoding?: string } | null);
  if (!data?.content || data?.encoding !== "base64") {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const content = Buffer.from(String(data.content).replace(/\n/g, ""), "base64").toString("utf-8");
  return NextResponse.json({ content });
}
