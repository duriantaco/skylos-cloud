"use server";

import { createSignedState } from "@/lib/github-state";
import { createClient } from "@/utils/supabase/server";
import { requirePermission, isAuthError } from "@/lib/permissions";

export async function getGitHubInstallUrl(projectId: string): Promise<string> {
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    throw new Error("Project not found");
  }

  const auth = await requirePermission(supabase, "manage:settings", project.org_id);
  if (isAuthError(auth)) {
    throw new Error("Unauthorized");
  }

  const state = createSignedState(projectId);
  const appName = "skylos-gate";
  return `https://github.com/apps/${appName}/installations/new?state=${encodeURIComponent(state)}`;
}
