import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRepoUrlOrFilter } from "@/lib/github-repo";

type OidcResolution<T> =
  | { kind: "ok"; project: T }
  | { kind: "not_found" }
  | { kind: "ambiguous"; count: number };

export async function resolveOidcProject<T>(
  supabase: SupabaseClient,
  repository: string,
  select: string
): Promise<OidcResolution<T>> {
  const repoUrl = `https://github.com/${repository}`;
  const repoFilter = buildRepoUrlOrFilter(repoUrl);
  if (!repoFilter) {
    return { kind: "not_found" };
  }

  const { data, error } = await supabase
    .from("projects")
    .select(select)
    .or(repoFilter)
    .limit(2);

  if (error) {
    throw error;
  }

  const projects = ((data ?? []) as unknown) as T[];

  if (projects.length === 0) {
    return { kind: "not_found" };
  }

  if (projects.length > 1) {
    return { kind: "ambiguous", count: projects.length };
  }

  return { kind: "ok", project: projects[0] };
}
