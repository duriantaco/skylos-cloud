import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const { reason } = await request.json();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: scanData, error: scanError } = await supabase
    .from("scans")
    .select(`*, projects ( repo_url, org_id )`)
    .eq("id", id)
    .single();

  const orgId = (scanData.projects as any)?.org_id;
    if (!orgId) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

  const { data: member, error: memErr } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  if (memErr || !member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = String(member.role || "").toLowerCase();
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }


  const { error: updateError } = await supabase
    .from("scans")
    .update({
      is_overridden: true,
      override_reason: reason,
      overridden_at: new Date().toISOString(),
      overridden_by: user.id,
      quality_gate_passed: true
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (process.env.GITHUB_TOKEN && scanData.projects?.repo_url) {
    try {
      const parts = scanData.projects.repo_url.split("github.com/");
      if (parts.length > 1) {
        const repoPath = parts[1].replace(".git", "");
        const sha = scanData.commit_hash;

        if (repoPath && sha && sha !== "local") {
          await fetch(`https://api.github.com/repos/${repoPath}/statuses/${sha}`, {
            method: "POST",
            headers: {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
              Accept: "application/vnd.github.v3+json"
            },
            body: JSON.stringify({
              state: "success",
              description: `Overridden by ${user.email}: ${reason}`,
              context: "Skylos Quality Gate"
            })
          });
        }
      }
    } catch (e) {
      console.error("Failed to update GitHub status:", e);
    }
  }

  return NextResponse.json({ success: true });
}
