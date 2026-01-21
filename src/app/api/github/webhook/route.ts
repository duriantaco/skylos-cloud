import { NextRequest, NextResponse } from "next/server";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import crypto from "crypto";

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const APP_ID = process.env.GITHUB_APP_ID!;
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY!;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;

function verifySignature(payload: string, signature: string): boolean {
  const sig = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  return `sha256=${sig}` === signature;
}

async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const auth = createAppAuth({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
    installationId,
  });
  
  const { token } = await auth({ type: "installation" });
  return new Octokit({ auth: token });
}

async function handleInstallation(payload: any) {
  const installationId = payload.installation.id;
  const repos = payload.repositories || [];
  const account = payload.installation.account;
  
  const octokit = await getInstallationOctokit(installationId);
  
  for (const repo of repos) {
    const [owner, repoName] = repo.full_name.split("/");
    const repoUrl = `https://github.com/${repo.full_name}`;
    
    const { error: updateError } = await supabase
      .from('projects')
      .update({ github_installation_id: installationId })
      .eq('repo_url', repoUrl);
    
    if (updateError) {
      console.error(`Failed to save installation for ${repoUrl}:`, updateError);
    } else {
      console.log(`✓ Saved installation ID ${installationId} for ${repoUrl}`);
    }
    
    try {
      const { data: repoData } = await octokit.repos.get({ owner, repo: repoName });
      const defaultBranch = repoData.default_branch;
      
      let existingProtection: any = null;
      try {
        const { data } = await octokit.repos.getBranchProtection({
          owner,
          repo: repoName,
          branch: defaultBranch,
        });
        existingProtection = data;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }
      
      const existingChecks = existingProtection?.required_status_checks?.contexts || [];
      const newChecks = [...new Set([...existingChecks, "Skylos Quality Gate"])];
      
      await octokit.repos.updateBranchProtection({
        owner,
        repo: repoName,
        branch: defaultBranch,
        required_status_checks: {
          strict: true,
          contexts: newChecks,
        },
        enforce_admins: existingProtection?.enforce_admins?.enabled ?? false,
        required_pull_request_reviews: existingProtection?.required_pull_request_reviews ?? null,
        restrictions: existingProtection?.restrictions ?? null,
      });
      
      console.log(`✓ Enabled branch protection for ${repo.full_name}:${defaultBranch}`);
    } catch (e) {
      console.error(`Failed to configure branch protection for ${repo.full_name}:`, e);
    }
  }
}

async function handlePullRequest(payload: any) {
  const installationId = payload.installation.id;
  const octokit = await getInstallationOctokit(installationId);
  
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const sha = payload.pull_request.head.sha;
  
  await octokit.checks.create({
    owner,
    repo,
    name: "Skylos Quality Gate",
    head_sha: sha,
    status: "queued",
    output: {
      title: "Waiting for scan",
      summary: "Skylos scan will run when triggered by CI or manual upload.",
    },
  });
}

async function handleCheckRun(payload: any) {
  if (payload.action !== "rerequested") 
    return;
  console.log("Check run re-requested:", payload.check_run.id);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") || "";
  
  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  
  const event = request.headers.get("x-github-event");
  const payload = JSON.parse(body);
  
  try {
    switch (event) {
      case "installation":
      case "installation_repositories":
        if (payload.action === "created" || payload.action === "added") {
          await handleInstallation(payload);
        }
        break;
        
      case "pull_request":
        if (["opened", "synchronize", "reopened"].includes(payload.action)) {
          await handlePullRequest(payload);
        }
        break;
        
      case "check_run":
        await handleCheckRun(payload);
        break;
    }
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}