import { getInstallationOctokit } from "./github-app";
import {
  buildRepoUrlOrFilter,
  normalizeGitHubRepoUrl,
  parseGitHubRepoUrl,
  type GitHubRepoRef,
} from "./github-repo-core";

export {
  buildRepoUrlOrFilter,
  normalizeGitHubRepoUrl,
  parseGitHubRepoUrl,
  type GitHubRepoRef,
};

export async function resolveGitHubDefaultBranch(
  repoUrl: string | null | undefined,
  installationId?: number | null
): Promise<string | null> {
  if (!installationId) {
    return null;
  }

  const repo = parseGitHubRepoUrl(repoUrl);
  if (!repo) {
    return null;
  }

  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.repos.get({
    owner: repo.owner,
    repo: repo.repo,
  });

  return data.default_branch || null;
}
