import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import {
  buildRepoUrlOrFilter,
  normalizeGitHubRepoUrl,
} from "@/lib/github-repo";
import { requirePermission, isAuthError } from "@/lib/permissions";


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: project } = await supabase
      .from("projects")
      .select("id, org_id")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const auth = await requirePermission(supabase, "edit:projects", project.org_id);
    if (isAuthError(auth)) return auth;

    const body = await req.json();

    const allowedUpdates: Record<string, unknown> = {};
    if ("repo_url" in body) {
      if (typeof body.repo_url === "string" && body.repo_url.trim().length > 0) {
        const normalizedRepoUrl = normalizeGitHubRepoUrl(body.repo_url);
        if (!normalizedRepoUrl) {
          return NextResponse.json(
            { error: "A valid GitHub repository URL is required" },
            { status: 400 }
          );
        }

        const repoFilter = buildRepoUrlOrFilter(normalizedRepoUrl);
        if (repoFilter) {
          const { data: existingProjects, error: existingError } = await supabase
            .from("projects")
            .select("id, name, org_id")
            .or(repoFilter)
            .limit(10);

          if (existingError) {
            return serverError(existingError, "Check repo URL uniqueness");
          }

          const conflictProject = (existingProjects || []).find(
            (existingProject) => existingProject.id !== id
          );

          if (conflictProject) {
            return NextResponse.json(
              conflictProject.org_id === project.org_id
                ? {
                    error:
                      "This GitHub repository is already linked to another project in this workspace.",
                    conflict_project: {
                      id: conflictProject.id,
                      name: conflictProject.name,
                    },
                  }
                : {
                    error:
                      "This GitHub repository is already linked to another project. Use a unique repo binding per project.",
                  },
              { status: 409 }
            );
          }
        }

        allowedUpdates.repo_url = normalizedRepoUrl;
      } else {
        allowedUpdates.repo_url = null;
      }
    }

    const { error } = await supabase
      .from("projects")
      .update(allowedUpdates)
      .eq("id", id);

    if (error) {
      return serverError(error, "Update project");
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return serverError(e, "Project update");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: project } = await supabase
      .from("projects")
      .select("id, org_id")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const auth = await requirePermission(supabase, "delete:projects", project.org_id);
    if (isAuthError(auth)) return auth;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      return serverError(error, "Delete project");
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return serverError(e, "Project delete");
  }
}
