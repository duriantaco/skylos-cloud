import { createClient } from "@/utils/supabase/server";
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

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, orgId: member?.org_id ?? null, supabase };
}

export async function getUserProjects(supabase: SupabaseClient, orgId: string) {
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, repo_url, policy_config, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return projects || [];
}

export async function getProject(supabase: SupabaseClient, projectId: string, orgId: string) {
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, repo_url, policy_config, created_at, strict_mode, github_installation_id")
    .eq("id", projectId)
    .eq("org_id", orgId)
    .single();

  return project;
}