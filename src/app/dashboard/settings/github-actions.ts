"use server";

import { createSignedState } from "@/lib/github-state";

export async function getGitHubInstallUrl(projectId: string): Promise<string> {
  const state = createSignedState(projectId);
  const appName = "skylos-gate";
  return `https://github.com/apps/${appName}/installations/new?state=${encodeURIComponent(state)}`;
}
