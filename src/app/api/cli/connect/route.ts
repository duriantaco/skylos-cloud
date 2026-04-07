import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getSupabaseAdmin } from "@/utils/supabase/admin";
import { issueProjectApiKey } from "@/lib/project-api-keys";

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { project_id } = body;

  if (!project_id) {
    return NextResponse.json(
      { error: "Missing project_id" },
      { status: 400 }
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, org_id, organizations(name, plan, pro_expires_at)")
    .eq("id", project_id)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  const auth = await requirePermission(supabase, "rotate:keys", project.org_id);
  if (isAuthError(auth)) return auth;

  let apiKey: string;
  try {
    const admin = getSupabaseAdmin();
    const issued = await issueProjectApiKey(admin, {
      projectId: project_id,
      label: "CLI connection",
      role: "secondary",
      source: "cli_connect",
      createdBy: user.id,
    });
    apiKey = issued.plain;
  } catch {
    return NextResponse.json(
      { error: "Failed to issue API key" },
      { status: 500 }
    );
  }

  const orgData = Array.isArray(project.organizations)
    ? project.organizations[0]
    : project.organizations;

  return NextResponse.json({
    token: apiKey,
    project_id: project.id,
    project_name: project.name,
    org_name: orgData?.name || "My Workspace",
    plan: getEffectivePlan({ plan: orgData?.plan || "free", pro_expires_at: orgData?.pro_expires_at }),
  });
}
