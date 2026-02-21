import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { serverError } from "@/lib/api-error";
import { generateFix, generateDiffPreview } from "@/lib/fix-generator";


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

    const originalContent = Buffer.from(fileData.content, "base64").toString("utf-8");

    const hardcodedFix = getFixSuggestion(finding);
    let newContent: string;
    let fixExplanation: string;
    let fixSource: "hardcoded" | "llm";

    if (hardcodedFix) {
      const lines = originalContent.split("\n");
      const lineIndex = finding.line_number - 1;
      const originalLine = lines[lineIndex] || "";
      const indentation = originalLine.match(/^\s*/)?.[0] || "";
      lines[lineIndex] = indentation + hardcodedFix;
      newContent = lines.join("\n");
      fixExplanation = `Applied known fix pattern for ${finding.rule_id}.`;
      fixSource = "hardcoded";
    } else {
      const llmResult = await generateFix(originalContent, {
        rule_id: finding.rule_id,
        message: finding.message,
        line_number: finding.line_number,
        severity: finding.severity,
        snippet: finding.snippet,
        category: finding.category,
      });

      if (!llmResult) {
        try {
          await octokit.git.deleteRef({ owner, repo, ref: `heads/${newBranchName}` });
        } catch { /* best effort */ }
        return NextResponse.json(
          { error: "Could not generate an automated fix for this finding. Try fixing it manually." },
          { status: 422 }
        );
      }

      newContent = llmResult.fixedContent;
      fixExplanation = llmResult.explanation;
      fixSource = "llm";
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: finding.file_path,
      message: `fix: resolve ${finding.rule_id} in ${finding.file_path} (Skylos)`,
      content: Buffer.from(newContent).toString("base64"),
      branch: newBranchName,
      sha: fileData.sha,
    });

    const diffPreview = generateDiffPreview(originalContent, newContent, finding.file_path);
    const prBody = buildPrBody(finding, fixExplanation, fixSource, diffPreview);

    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title: `fix: ${finding.rule_id} – ${truncate(finding.message, 60)}`,
      head: newBranchName,
      base: "main",
      body: prBody,
    });

    return NextResponse.json({
      success: true,
      pr_url: pr.html_url,
      fix_source: fixSource,
    });

  } catch (error) {
    return serverError(error, "GitHub API");
  }
}

function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 1) + "\u2026" : str;
}

function buildPrBody(
  finding: any,
  explanation: string,
  source: "hardcoded" | "llm",
  diffPreview: string
): string {
  const badge = source === "llm" ? " (AI-generated)" : "";

  return `## Skylos Security Fix${badge}

| Field | Value |
|-------|-------|
| **Rule** | \`${finding.rule_id}\` |
| **Severity** | ${finding.severity} |
| **File** | \`${finding.file_path}:${finding.line_number}\` |
| **Category** | ${finding.category || "–"} |

### What was found
${finding.message}

### What changed
${explanation}

${diffPreview ? `### Diff preview\n${diffPreview}` : ""}

---
${source === "llm" ? "🤖 *This fix was generated by AI. Please review carefully before merging.*\n\n" : ""}🛡️ Automatically created by [Skylos](https://skylos.dev)`;
}
