import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api-key";
import { trackEvent } from "@/lib/analytics";
import { serverError } from "@/lib/api-error";
import {
  buildRepoUrlOrFilter,
  normalizeGitHubRepoUrl,
} from "@/lib/github-repo";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getCapabilities, getEffectivePlan } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "view:projects");
    if (isAuthError(auth)) return auth;

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ projects: projects || [] });
  } catch (e: unknown) {
    return serverError(e, "List projects");
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { org_id, name, repo_url } = body;
    const normalizedRepoUrl =
      typeof repo_url === "string" && repo_url.trim().length > 0
        ? normalizeGitHubRepoUrl(repo_url)
        : null;

    if (!org_id || !name?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (repo_url && !normalizedRepoUrl) {
      return NextResponse.json(
        { error: "A valid GitHub repository URL is required" },
        { status: 400 }
      );
    }

    const auth = await requirePermission(supabase, "create:projects", org_id);
    if (isAuthError(auth)) return auth;

    // Enforce project limit based on plan
    const { data: org } = await supabase
      .from("organizations")
      .select("plan, pro_expires_at")
      .eq("id", org_id)
      .single();

    const effectivePlan = getEffectivePlan({ plan: org?.plan || "free", pro_expires_at: org?.pro_expires_at });
    const caps = getCapabilities(effectivePlan);

    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org_id);

    if ((count ?? 0) >= caps.maxProjectsAllowed) {
      return NextResponse.json({
        error: `Project limit reached (${caps.maxProjectsAllowed} on ${effectivePlan} plan). Purchase credits to unlock more projects.`,
        code: "PROJECT_LIMIT",
        buy_url: "/dashboard/billing",
      }, { status: 403 });
    }

    if (normalizedRepoUrl) {
      const repoFilter = buildRepoUrlOrFilter(normalizedRepoUrl);
      if (repoFilter) {
        const { data: existingProjects, error: existingError } = await supabase
          .from("projects")
          .select("id, org_id, name")
          .or(repoFilter)
          .limit(2);

        if (existingError) {
          return serverError(existingError, "Check repo URL uniqueness");
        }

        if ((existingProjects || []).length > 0) {
          return NextResponse.json(
            {
              error:
                "This GitHub repository is already linked to another project. Use a unique repo binding per project.",
            },
            { status: 409 }
          );
        }
      }
    }

    const { plain: apiKey, hash: apiKeyHash } = generateApiKey();

    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        org_id,
        name: name.trim(),
        repo_url: normalizedRepoUrl,
        api_key_hash: apiKeyHash,
      })
      .select()
      .single();

    if (insertError) {
      return serverError(insertError, "Create project");
    }

    trackEvent("project_created", org_id);

    const responseProject = project ? { ...project, api_key: apiKey } : null;
    return NextResponse.json({ success: true, project: responseProject, api_key: apiKey });
  } catch (e: unknown) {
    return serverError(e, "Project create");
  }
}
