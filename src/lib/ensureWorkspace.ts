import { createClient } from "@/utils/supabase/server";
import { resolveActiveOrganizationForRequest } from "@/lib/active-org";
import { SupabaseClient } from "@supabase/supabase-js";

type EnsureWorkspaceResult = {
  user: { id: string; email?: string } | null;
  orgId: string | null;
  supabase: SupabaseClient;
};

export async function ensureWorkspace(): Promise<EnsureWorkspaceResult> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, orgId: null, supabase };
  }

  const activeOrg = await resolveActiveOrganizationForRequest(supabase, user.id, {
    select: "org_id",
  });

  return { user, orgId: activeOrg.orgId, supabase };
}

export async function getUserProjects(supabase: SupabaseClient, orgId: string) {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, repo_url, policy_config, policy_inheritance_mode, ai_assurance_enabled, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return projects || [];
}

export async function getProject(supabase: SupabaseClient, projectId: string, orgId: string) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, repo_url, policy_config, policy_inheritance_mode, ai_assurance_enabled, created_at, strict_mode, github_installation_id")
    .eq("id", projectId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) throw error;
  return project;
}
