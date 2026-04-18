import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { resolveOidcProject } from "@/lib/oidc-project";
import { resolveProjectFromToken } from "@/lib/project-api-keys";

export type UploadProject = {
  id: string;
  name: string;
  org_id: string;
  strict_mode: boolean | null;
  repo_url: string | null;
  github_installation_id: number | null;
  organizations: unknown;
};

export function getReportSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }
  return createClient(url, key);
}

export async function resolveReportProject(
  req: Request,
  supabase: ReturnType<typeof getReportSupabaseAdmin>,
): Promise<{ project: UploadProject | null; response: NextResponse | null }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      project: null,
      response: NextResponse.json(
        {
          error: "Missing token. Run with --token or set SKYLOS_TOKEN env var.",
          code: "NO_TOKEN",
        },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.split(" ")[1];
  const authMode = req.headers.get("x-skylos-auth");

  if (authMode === "oidc") {
    const { verifyGitHubOIDC } = await import("@/lib/github-oidc");
    const claims = await verifyGitHubOIDC(token);
    if (!claims) {
      return {
        project: null,
        response: NextResponse.json(
          {
            error:
              "Invalid OIDC token. Ensure your workflow has id-token: write permission.",
            code: "INVALID_OIDC",
          },
          { status: 401 },
        ),
      };
    }

    const resolution = await resolveOidcProject<UploadProject>(
      supabase!,
      claims.repository,
      "id, name, org_id, strict_mode, repo_url, github_installation_id, organizations(plan, pro_expires_at)",
    );

    if (resolution.kind === "not_found") {
      return {
        project: null,
        response: NextResponse.json(
          {
            error: `No project linked to ${claims.repository}. Create a project at skylos.dev and set the repo URL.`,
            code: "REPO_NOT_LINKED",
          },
          { status: 404 },
        ),
      };
    }

    if (resolution.kind === "ambiguous") {
      return {
        project: null,
        response: NextResponse.json(
          {
            error: `Multiple projects are linked to ${claims.repository}. OIDC uploads require a unique repo-to-project binding.`,
            code: "AMBIGUOUS_REPO_BINDING",
          },
          { status: 409 },
        ),
      };
    }

    return { project: resolution.project, response: null };
  }

  const resolved = await resolveProjectFromToken<UploadProject>(
    supabase!,
    token,
    "id, name, org_id, strict_mode, repo_url, github_installation_id, organizations(plan, pro_expires_at)",
  );

  if (!resolved?.project) {
    return {
      project: null,
      response: NextResponse.json(
        {
          error: "Invalid API Token. Check your SKYLOS_TOKEN.",
          code: "INVALID_TOKEN",
        },
        { status: 403 },
      ),
    };
  }

  return { project: resolved.project, response: null };
}
