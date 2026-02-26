import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api-key";
import { trackEvent } from "@/lib/analytics";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getCapabilities } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
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
  } catch (e: any) {
    return serverError(e, "List projects");
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { org_id, name, repo_url } = body;

    if (!org_id || !name?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const auth = await requirePermission(supabase, "create:projects", org_id);
    if (isAuthError(auth)) return auth;

    // Enforce project limit based on plan
    const { data: org } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", org_id)
      .single();

    const caps = getCapabilities(org?.plan || "free");

    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org_id);

    if ((count ?? 0) >= caps.maxProjectsAllowed) {
      return NextResponse.json({
        error: `Project limit reached (${caps.maxProjectsAllowed} on ${org?.plan || "free"} plan). Purchase credits to unlock more projects.`,
        code: "PROJECT_LIMIT",
      }, { status: 403 });
    }

    const { plain: apiKey, hash: apiKeyHash } = generateApiKey();

    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        org_id,
        name: name.trim(),
        repo_url: repo_url?.trim() || null,
        api_key_hash: apiKeyHash,
      })
      .select()
      .single();

    if (project) {
      (project as any).api_key = apiKey;
    }

    if (insertError) {
      return serverError(insertError, "Create project");
    }

    trackEvent("project_created", org_id);

    return NextResponse.json({ success: true, project });
  } catch (e: any) {
    return serverError(e, "Project create");
  }
}
