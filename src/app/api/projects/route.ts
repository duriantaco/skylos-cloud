import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { trackEvent } from "@/lib/analytics";

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

    const apiKey = "sk_live_" + crypto.randomBytes(24).toString("hex");

    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        org_id,
        name: name.trim(),
        repo_url: repo_url?.trim() || null,
        api_key: apiKey,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    trackEvent("project_created", org_id);

    return NextResponse.json({ success: true, project });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}