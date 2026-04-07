import type { SupabaseClient } from "@supabase/supabase-js";
import { generateApiKey, hashApiKey } from "@/lib/api-key";

export type ProjectApiKeyRole = "primary" | "secondary";

type ResolvedJoinRow<T> = {
  id: string;
  project_id: string;
  role: ProjectApiKeyRole;
  source: string;
  project: T | T[] | null;
};

type ResolveResult<T> = {
  project: T;
  projectApiKeyId: string | null;
  role: ProjectApiKeyRole | null;
  source: string;
  legacy: boolean;
};

type StoreProjectApiKeyHashArgs = {
  projectId: string;
  keyHash: string;
  label?: string | null;
  role?: ProjectApiKeyRole;
  source: string;
  createdBy?: string | null;
  replaceActivePrimary?: boolean;
};

type IssueProjectApiKeyArgs = Omit<StoreProjectApiKeyHashArgs, "keyHash">;

function unwrapProject<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function resolveProjectFromToken<T>(
  supabase: SupabaseClient,
  token: string,
  projectSelect: string
): Promise<ResolveResult<T> | null> {
  const tokenHash = hashApiKey(token);

  const { data: keyRow, error: keyError } = await supabase
    .from("project_api_keys")
    .select(`id, project_id, role, source, project:projects!inner(${projectSelect})`)
    .eq("key_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (keyError) throw keyError;

  const joined = keyRow as ResolvedJoinRow<T> | null;
  const joinedProject = unwrapProject(joined?.project);
  if (joined && joinedProject) {
    void supabase
      .from("project_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", joined.id);

    return {
      project: joinedProject,
      projectApiKeyId: joined.id,
      role: joined.role,
      source: joined.source,
      legacy: false,
    };
  }

  const { data: legacyProject, error: legacyError } = await supabase
    .from("projects")
    .select(projectSelect)
    .eq("api_key_hash", tokenHash)
    .maybeSingle();

  if (legacyError) throw legacyError;
  if (!legacyProject) return null;

  return {
    project: legacyProject as T,
    projectApiKeyId: null,
    role: null,
    source: "legacy-project",
    legacy: true,
  };
}

export async function storeProjectApiKeyHash(
  supabase: SupabaseClient,
  args: StoreProjectApiKeyHashArgs
): Promise<string> {
  const role = args.role ?? "secondary";
  const now = new Date().toISOString();

  if (role === "primary" && args.replaceActivePrimary) {
    const { error: revokeError } = await supabase
      .from("project_api_keys")
      .update({
        revoked_at: now,
        revoked_by: args.createdBy ?? null,
      })
      .eq("project_id", args.projectId)
      .eq("role", "primary")
      .is("revoked_at", null);

    if (revokeError) throw revokeError;
  }

  const { data, error } = await supabase
    .from("project_api_keys")
    .insert({
      project_id: args.projectId,
      key_hash: args.keyHash,
      label: args.label ?? null,
      role,
      source: args.source,
      created_by: args.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw error ?? new Error("Failed to store project API key");
  }

  return data.id;
}

export async function issueProjectApiKey(
  supabase: SupabaseClient,
  args: IssueProjectApiKeyArgs
): Promise<{ plain: string; hash: string; id: string }> {
  const { plain, hash } = generateApiKey();
  const id = await storeProjectApiKeyHash(supabase, {
    ...args,
    keyHash: hash,
  });
  return { plain, hash, id };
}
