import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api-key";
import { trackEvent } from "@/lib/analytics";
import { serverError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ projects: [] });
    }

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .eq("org_id", member.org_id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ projects: projects || [] });
  } catch (e: any) {
    return serverError(e, "List projects");
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { org_id, name, repo_url } = body;

    if (!org_id || !name?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", org_id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
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