import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const { reason } = await request.json();

  const { data: scanData, error: scanError } = await supabase
    .from("scans")
    .select(`*, projects ( repo_url, org_id )`)
    .eq("id", id)
    .single();

  const orgId = (scanData?.projects as any)?.org_id;
  if (!orgId) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const auth = await requirePermission(supabase, "override:gates", orgId);
  if (isAuthError(auth)) return auth;

  const { error: updateError } = await supabase
    .from("scans")
    .update({
      is_overridden: true,
      override_reason: reason,
      overridden_at: new Date().toISOString(),
      overridden_by: auth.user.id,
      quality_gate_passed: true
    })
    .eq("id", id);

  if (updateError) {
    return serverError(updateError, "Override scan quality gate");
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
              description: `Overridden by ${auth.user.email}: ${reason}`,
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
