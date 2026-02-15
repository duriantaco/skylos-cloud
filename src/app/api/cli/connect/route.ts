import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api-key";

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

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json(
      { error: "No workspace found" },
      { status: 403 }
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, org_id, organizations(name, plan)")
    .eq("id", project_id)
    .eq("org_id", member.org_id)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
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
    plan: orgData?.plan || "free",
  });
}
