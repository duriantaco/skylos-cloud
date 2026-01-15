import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const reason: string | null = typeof body.reason === "string" ? body.reason : null;
  const expires_at: string | null = typeof body.expires_at === "string" ? body.expires_at : null;

  const { data: finding, error: fErr } = await supabase
    .from("findings")
    .select("id, scan_id, rule_id, file_path, line_number, is_new")
    .eq("id", id)
    .single();

  if (fErr || !finding) {
    return NextResponse.json({ error: "Finding not found or access denied" }, { status: 404 });
  }

  const { data: scan, error: sErr } = await supabase
    .from("scans")
    .select("id, project_id, commit_hash, quality_gate_passed, is_overridden, stats, projects(repo_url)")
    .eq("id", finding.scan_id)
    .single();

  if (sErr || !scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const { error: supErr } = await supabase
    .from("finding_suppressions")
    .upsert(
      {
        project_id: scan.project_id,
        rule_id: finding.rule_id,
        file_path: finding.file_path,
        line_number: finding.line_number || 0,
        reason,
        created_by: user.id,
        expires_at
      },
      { onConflict: "project_id,rule_id,line_number,file_path" }
    );

  if (supErr) {
    return NextResponse.json({ error: supErr.message }, { status: 500 });
  }

  const { error: upErr } = await supabase
    .from("findings")
    .update({ is_suppressed: true })
    .eq("scan_id", scan.id)
    .eq("rule_id", finding.rule_id)
    .eq("file_path", finding.file_path)
    .eq("line_number", finding.line_number || 0);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { count: unsuppressedNewCount } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("scan_id", scan.id)
    .eq("is_new", true)
    .eq("is_suppressed", false);

  const passed = (unsuppressedNewCount || 0) === 0 || !!scan.is_overridden;

  const { error: scanUpErr } = await supabase
    .from("scans")
    .update({
      quality_gate_passed: passed,
      stats: { ...(scan.stats as any || {}), new_issues: unsuppressedNewCount || 0 }
    })
    .eq("id", scan.id);

  if (scanUpErr) {
    return NextResponse.json({ error: scanUpErr.message }, { status: 500 });
  }

  const projectRef = scan.projects as any;
  const repoUrl = Array.isArray(projectRef) ? projectRef[0]?.repo_url : projectRef?.repo_url;

  if (passed && process.env.GITHUB_TOKEN && repoUrl) {
    try {
      const parts = repoUrl.split("github.com/");
      if (parts.length > 1) {
        const repoPath = parts[1].replace(".git", "");
        const sha = scan.commit_hash;
        if (repoPath && sha && sha !== "local") {
          await fetch(`https://api.github.com/repos/${repoPath}/statuses/${sha}`, {
            method: "POST",
            headers: {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
              Accept: "application/vnd.github.v3+json",
            },
            body: JSON.stringify({
              state: "success",
              description: `Suppressed: ${reason || "False Positive"}`,
              context: "Skylos Quality Gate",
            }),
          });
        }
      }
    } catch (e) {
      console.error("Failed to update GitHub status:", e);
    }
  }

  return NextResponse.json({
    success: true,
    scan: { id: scan.id, quality_gate_passed: passed, new_issues: unsuppressedNewCount || 0 }
  });
}