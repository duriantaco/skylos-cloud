export type GitHubRepoRef = {
  owner: string;
  repo: string;
};

export function normalizeGitHubRepoUrl(
  input: string | null | undefined
): string | null {
  if (!input) return null;

  let normalized = input.trim();
  if (!normalized) return null;

  if (normalized.startsWith("git@github.com:")) {
    normalized = normalized.replace("git@github.com:", "https://github.com/");
  }

  if (normalized.startsWith("ssh://git@github.com/")) {
    normalized = normalized.replace(
      "ssh://git@github.com/",
      "https://github.com/"
    );
  }

  if (!/^https?:\/\//i.test(normalized) && normalized.startsWith("github.com/")) {
    normalized = `https://${normalized}`;
  }

  normalized = normalized.replace(/^http:\/\//i, "https://");
  normalized = normalized.replace(/\.git$/i, "").replace(/\/+$/, "");

  const match = normalized.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/i);
  if (!match) return null;

  return `https://github.com/${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
}

export function parseGitHubRepoUrl(
  repoUrl: string | null | undefined
): GitHubRepoRef | null {
  const normalized = normalizeGitHubRepoUrl(repoUrl);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/i);

  if (!match) {
    return null;
  }

  return { owner: match[1], repo: match[2] };
}

export function buildRepoUrlOrFilter(repoUrl: string): string | null {
  const normalized = normalizeGitHubRepoUrl(repoUrl);
  if (!normalized) return null;

  return [`repo_url.eq.${normalized}`, `repo_url.eq.${normalized}.git`].join(",");
}
