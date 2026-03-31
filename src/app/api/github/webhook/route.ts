/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import crypto from "crypto";
import { serverError } from "@/lib/api-error";
import { buildRepoUrlOrFilter } from "@/lib/github-repo";
import { canAutoConfigureGitHubInstall } from "@/lib/github-installation-core";

import { createClient } from '@supabase/supabase-js'

const APP_ID = process.env.GITHUB_APP_ID!;
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY!;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;
const AUTO_CONFIGURE_INSTALLATIONS = process.env.GITHUB_APP_AUTO_CONFIGURE === "true";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createClient(url, key)
}

function verifySignature(payload: string, signature: string): boolean {
  const sig = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  const expected = Buffer.from(`sha256=${sig}`);
  const received = Buffer.from(signature || "");
  if (expected.length !== received.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, received);
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

async function linkInstallationToRepo(fullName: string, installationId: number) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { kind: "error" as const, error: new Error("Missing Supabase environment variables") };
  }

  const repoFilter = buildRepoUrlOrFilter(`https://github.com/${fullName}`);
  if (!repoFilter) {
    return { kind: "invalid" as const };
  }

  const { data: projects, error: lookupError } = await supabase
    .from("projects")
    .select("id, name, repo_url, policy_config, organizations(plan, pro_expires_at)")
    .or(repoFilter)
    .limit(3);

  if (lookupError) {
    return { kind: "error" as const, error: lookupError };
  }

  if (!projects || projects.length === 0) {
    return { kind: "missing" as const };
  }

  if (projects.length > 1) {
    return { kind: "ambiguous" as const, projects };
  }

  const project = projects[0];
  const { data: updatedProjects, error: updateError } = await supabase
    .from("projects")
    .update({ github_installation_id: installationId })
    .eq("id", project.id)
    .select("id, name, repo_url, policy_config, organizations(plan, pro_expires_at)");

  if (updateError) {
    return { kind: "error" as const, error: updateError };
  }

  return {
    kind: "linked" as const,
    projects: updatedProjects || [project],
  };
}

function buildSkylosWorkflowYaml(defaultBranch: string): string {
  const branches = JSON.stringify([defaultBranch]);
  return `name: Skylos Quality Gate

on:
  pull_request:
    branches: ${branches}

permissions:
  contents: read
  id-token: write
  checks: write

jobs:
  skylos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Skylos
        run: pip install skylos

      - name: Run Skylos Scan & Upload
        run: skylos . --danger --upload
`;
}

function shouldAutoConfigureProject(project: {
  policy_config?: Record<string, unknown> | null;
  organizations?:
    | {
        plan?: string | null;
        pro_expires_at?: string | null;
      }
    | Array<{
        plan?: string | null;
        pro_expires_at?: string | null;
      }>
    | null;
}): boolean {
  const org = Array.isArray(project.organizations)
    ? (project.organizations[0] ?? null)
    : (project.organizations ?? null);

  return canAutoConfigureGitHubInstall(
    project.policy_config ?? null,
    AUTO_CONFIGURE_INSTALLATIONS,
    org
  );
}

async function configureRepository(
  octokit: Octokit,
  owner: string,
  repoName: string,
  fullName: string
) {
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

  console.log(`Enabled branch protection for ${fullName}:${defaultBranch}`);

  try {
    await createWorkflowPR(octokit, owner, repoName, defaultBranch);
  } catch (prErr: any) {
    console.warn(`Could not create workflow PR for ${fullName}:`, prErr.message);
  }
}

async function createWorkflowPR(octokit: Octokit, owner: string, repo: string, defaultBranch: string) {
  // Check if workflow already exists
  try {
    await octokit.repos.getContent({
      owner,
      repo,
      path: '.github/workflows/skylos.yml',
      ref: defaultBranch,
    });
    console.log(`Workflow already exists in ${owner}/${repo}, skipping PR`);
    return;
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }

  // Get the latest commit SHA on default branch
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });
  const baseSha = ref.object.sha;

  // Create a new branch
  const branchName = 'skylos/add-quality-gate';
  try {
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });
  } catch (e: any) {
    if (e.status === 422) {
      console.log(`Branch ${branchName} already exists in ${owner}/${repo}, skipping PR`);
      return;
    }
    throw e;
  }

  // Create the workflow file
  const content = Buffer.from(buildSkylosWorkflowYaml(defaultBranch)).toString('base64');
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: '.github/workflows/skylos.yml',
    message: 'Add Skylos quality gate',
    content,
    branch: branchName,
  });

  // Open PR
  await octokit.pulls.create({
    owner,
    repo,
    title: 'Add Skylos Quality Gate',
    body: [
      '## Skylos Quality Gate',
      '',
      'This PR adds automatic code scanning on every pull request.',
      '',
      '**What it does:**',
      '- Scans for security vulnerabilities, dead code, and hardcoded secrets',
      '- Uploads results to your [Skylos dashboard](https://skylos.dev/dashboard)',
      '- Uses tokenless authentication (no secrets needed)',
      '',
      '**No configuration required.** Merge this PR and Skylos will start scanning automatically.',
      '',
      '---',
      '_Created automatically by the [Skylos GitHub App](https://skylos.dev)._',
    ].join('\n'),
    head: branchName,
    base: defaultBranch,
  });

  console.log(`Created workflow PR in ${owner}/${repo}`);
}

async function handleInstallation(payload: any) {
  const installationId = payload.installation.id;
  const repos = payload.repositories || [];
  
  console.log(`Processing installation ${installationId} with ${repos.length} repos`);
  
  const octokit = await getInstallationOctokit(installationId);
  
  for (const repo of repos) {
    const fullName = repo.full_name;
    const [owner, repoName] = fullName.split("/");
    
    const linkResult = await linkInstallationToRepo(fullName, installationId);

    if (linkResult.kind === "error") {
      console.error(`Failed to update installation for ${fullName}:`, linkResult.error);
    } else if (linkResult.kind === "ambiguous") {
      console.error(
        `Refusing to link ${fullName}: multiple projects share the same repo URL`,
        linkResult.projects
      );
    } else if (linkResult.kind === "linked") {
      const matchedProjects = linkResult.projects;
      console.log(`Linked installation ${installationId} to ${matchedProjects.length} project(s):`);
      matchedProjects.forEach(p => console.log(`   - ${p.name} (${p.repo_url})`));
    } else {
      console.log(`No projects found matching ${fullName} - user may need to create project first`);
    }
    
    const matchedProjects = linkResult.kind === "linked" ? linkResult.projects : [];
    const shouldAutoConfigure = matchedProjects.some(shouldAutoConfigureProject);

    if (!shouldAutoConfigure) {
      console.log(
        AUTO_CONFIGURE_INSTALLATIONS
          ? `Skipping automatic repo configuration for ${fullName}; project opt-in is disabled`
          : `Skipping automatic repo configuration for ${fullName}; set GITHUB_APP_AUTO_CONFIGURE=true to enable`
      );
      continue;
    }

    try {
      await configureRepository(octokit, owner, repoName, fullName);
    } catch (e: any) {
      console.warn(`Could not configure branch protection for ${fullName}:`, e.message);
    }
  }
}

async function handleInstallationRepositoriesAdded(payload: any) {
  const installationId = payload.installation.id;
  const addedRepos = payload.repositories_added || [];
  
  console.log(`Adding ${addedRepos.length} repos to installation ${installationId}`);
  const octokit = await getInstallationOctokit(installationId);
  
  for (const repo of addedRepos) {
    const fullName = repo.full_name;
    const [owner, repoName] = fullName.split("/");
    
    const linkResult = await linkInstallationToRepo(fullName, installationId);

    if (linkResult.kind === "error") {
      console.error(`Failed to link ${fullName}:`, linkResult.error);
    } else if (linkResult.kind === "ambiguous") {
      console.error(
        `Refusing to link ${fullName}: multiple projects share the same repo URL`,
        linkResult.projects
      );
    } else if (linkResult.kind === "linked") {
      console.log(`Linked ${fullName} to ${linkResult.projects.length} project(s)`);
    } else {
      console.log(`No projects found for ${fullName}`);
    }

    const matchedProjects = linkResult.kind === "linked" ? linkResult.projects : [];
    const shouldAutoConfigure = matchedProjects.some(shouldAutoConfigureProject);

    if (!shouldAutoConfigure) {
      console.log(
        AUTO_CONFIGURE_INSTALLATIONS
          ? `Skipping automatic repo configuration for ${fullName}; project opt-in is disabled`
          : `Skipping automatic repo configuration for ${fullName}; set GITHUB_APP_AUTO_CONFIGURE=true to enable`
      );
      continue;
    }

    try {
      await configureRepository(octokit, owner, repoName, fullName);
    } catch (e: any) {
      console.warn(`Could not configure branch protection for ${fullName}:`, e.message);
    }
  }
}

async function handleInstallationDeleted(payload: any) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Missing Supabase environment variables");
  }

  const installationId = payload.installation.id;
  
  console.log(`Installation ${installationId} deleted, clearing from projects`);
  
  const { data, error } = await supabase
    .from('projects')
    .update({ github_installation_id: null })
    .eq('github_installation_id', installationId)
    .select('id, name');
  
  if (error) {
    console.error('Failed to clear installation:', error);
  } else if (data && data.length > 0) {
    console.log(`Cleared installation from ${data.length} project(s)`);
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
  
  console.log(`Created pending check for PR in ${owner}/${repo}`);
}

async function handleCheckRun(payload: any) {
  if (payload.action !== "rerequested") return;
  console.log("Check run re-requested:", payload.check_run.id);
}

export async function POST(request: NextRequest) {
  if (!getSupabaseAdmin()) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") || "";
  
  if (!verifySignature(body, signature)) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  
  const event = request.headers.get("x-github-event");
  const payload = JSON.parse(body);
  
  console.log(`\nGitHub webhook: ${event} (action: ${payload.action})`);
  
  try {
    switch (event) {
      case "installation":
        if (payload.action === "created") {
          await handleInstallation(payload);
        } else if (payload.action === "deleted") {
          await handleInstallationDeleted(payload);
        }
        break;
        
      case "installation_repositories":
        if (payload.action === "added") {
          await handleInstallationRepositoriesAdded(payload);
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
        
      default:
        console.log(`Ignoring event: ${event}`);
    }
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return serverError(e, "Webhook");
  }
}
