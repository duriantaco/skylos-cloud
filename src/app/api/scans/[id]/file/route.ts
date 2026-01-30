import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getInstallationOctokit } from "@/lib/github-app";

function parseRepo(repoUrl: string) {
  const m = String(repoUrl || "").match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: scan, error: sErr } = await supabase
    .from("scans")
    .select("id, commit_hash, project_id, projects(repo_url, github_installation_id)")
    .eq("id", id)
    .single();

  if (sErr || !scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  const proj: any = scan.projects;
  const repo = parseRepo(proj?.repo_url);
  if (!repo) return NextResponse.json({ error: "Invalid repo_url" }, { status: 400 });

  const installationId = proj?.github_installation_id;
  if (!installationId) return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });

  const octokit = await getInstallationOctokit(installationId);

  const res = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
    owner: repo.owner,
    repo: repo.repo,
    path,
    ref: scan.commit_hash || "main",
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  });

  const data: any = res.data;
  if (!data?.content || data?.encoding !== "base64") {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const content = Buffer.from(String(data.content).replace(/\n/g, ""), "base64").toString("utf-8");
  return NextResponse.json({ content });
}
