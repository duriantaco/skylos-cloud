import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { serverError } from "@/lib/api-error";


async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    installationId,
  });
  const { token } = await auth({ type: "installation" });
  return new Octokit({ auth: token });
}

function getFixSuggestion(finding: any) {
  if (finding.taint_flow?.fix_suggestion?.code) {
    return finding.taint_flow.fix_suggestion.code;
  }

  const ruleId = String(finding.rule_id || "").toUpperCase();
  
  if (ruleId === "SKY-D201") {
    return 'import ast\nval = ast.literal_eval(user_input)';
  }
  if (ruleId === "SKY-D203" || ruleId === "SKY-D212") {
    return 'import subprocess\nsubprocess.run(["ls", "-l"], shell=False) # Use list args';
  }
  if (ruleId === "SKY-D209") {
    return 'subprocess.run(command_list, shell=False)';
  }

  if (ruleId === "SKY-D210") {
    return 'response = requests.get(url, verify=True)';
  }

  if (ruleId === "SKY-D211" || ruleId === "SKY-D217") {
    return 'cursor.execute("SELECT * FROM users WHERE id = %s", (user_input,))';
  }

  if (ruleId === "SKY-D216") {
    return 'if url.startswith("https://trusted.com"): requests.get(url)';
  }

  if (ruleId === "SKY-D226") {
    return 'from markupsafe import escape\nMarkup(escape(user_content))';
  }

  if (ruleId === "SKY-S101") {
    return 'API_KEY = os.environ.get("API_KEY")';
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: finding } = await supabase
    .from("findings")
    .select(`
      *,
      scans (
        commit_hash,
        projects (
          id,
          name,
          repo_url,
          github_installation_id,
          org_id
        )
      )
    `)
    .eq("id", id)
    .single();

  if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });

  const project = finding.scans?.projects;
  if (!project?.github_installation_id) {
    return NextResponse.json({ error: "GitHub App not installed for this project." }, { status: 400 });
  }

  const fixCode = getFixSuggestion(finding);
  if (!fixCode) {
    return NextResponse.json({ error: "No automated fix available for this rule." }, { status: 400 });
  }

  try {
    const octokit = await getInstallationOctokit(project.github_installation_id);
    
    const [owner, repo] = project.repo_url.replace("https://github.com/", "").replace(".git", "").split("/");
    
    const baseSha = finding.scans.commit_hash === 'local' ? 'main' : finding.scans.commit_hash;
    
    const timestamp = Date.now();
    const newBranchName = `skylos-fix-${finding.rule_id.toLowerCase()}-${timestamp}`;

    let shaToBranchFrom = baseSha;
    if (baseSha === 'main' || baseSha === 'master') {
       const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${baseSha}` });
       shaToBranchFrom = refData.object.sha;
    }

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranchName}`,
      sha: shaToBranchFrom,
    });

    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path: finding.file_path,
      ref: newBranchName,
    });

    if (Array.isArray(fileData) || !('content' in fileData)) {
      throw new Error("Could not retrieve file content.");
    }

    const content = Buffer.from(fileData.content, "base64").toString("utf-8");
    const lines = content.split("\n");
    
    const lineIndex = finding.line_number - 1;
    
    const originalLine = lines[lineIndex] || "";
    const indentation = originalLine.match(/^\s*/)?.[0] || "";
    
    lines[lineIndex] = indentation + fixCode;
    const newContent = lines.join("\n");

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: finding.file_path,
      message: `fix: resolve ${finding.rule_id} (Skylos)`,
      content: Buffer.from(newContent).toString("base64"),
      branch: newBranchName,
      sha: fileData.sha, 
    });

    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title: `Fix ${finding.rule_id}: ${finding.message}`,
      head: newBranchName,
      base: "main",
      body: `## Skylos Security Fix\n\n**Rule:** ${finding.rule_id}\n**Severity:** ${finding.severity}\n\nThis PR automatically fixes the issue detected by Skylos.`,
    });

    return NextResponse.json({ success: true, pr_url: pr.html_url });

  } catch (error) {
    return serverError(error, "GitHub API");
  }
}