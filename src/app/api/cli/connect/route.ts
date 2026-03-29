import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api-key";
import { getEffectivePlan } from "@/lib/entitlements";
import { resolveActiveOrganizationForRequest } from "@/lib/active-org";

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

  const activeOrg = await resolveActiveOrganizationForRequest(supabase, user.id, {
    requiredOrgId: project.org_id,
    select: "org_id",
  });

  if (!activeOrg.membership) {
    return NextResponse.json(
      { error: "You do not have access to this project" },
      { status: 403 }
    );
  }

  // Generate a new API key for CLI connection
  // This ensures we always return a valid key, even for existing projects
  const { plain: apiKey, hash: apiKeyHash } = generateApiKey();

  // Update the project with the new API key hash
  await supabase
    .from("projects")
    .update({ api_key_hash: apiKeyHash })
    .eq("id", project_id);

  const org = (project as any).organizations;
  const orgData = Array.isArray(org) ? org[0] : org;

  return NextResponse.json({
    token: apiKey,
    project_id: project.id,
    project_name: project.name,
    org_name: orgData?.name || "My Workspace",
    plan: getEffectivePlan({ plan: orgData?.plan || "free", pro_expires_at: orgData?.pro_expires_at }),
  });
}
