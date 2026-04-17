import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan, getCapabilities } from "@/lib/entitlements";
import { isGovernedPlan } from "@/lib/exception-governance";

type ProjectRef = { org_id?: string | null; repo_url?: string | null } | null;
type ProjectRefValue = ProjectRef | ProjectRef[];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const body = await request.json().catch(() => ({}));
  const reason: string | null = typeof body.reason === "string" ? body.reason : null;
  const expires_at: string | null = typeof body.expires_at === "string" ? body.expires_at : null;

  const { data: finding, error: fErr } = await supabase
    .from("findings")
    .select("id, scan_id, rule_id, file_path, line_number, is_new, group_id")
    .eq("id", id)
    .single();

  if (fErr || !finding) {
    return NextResponse.json({ error: "Finding not found or access denied" }, { status: 404 });
  }

  const { data: scan, error: sErr } = await supabase
    .from("scans")
    .select("id, project_id, commit_hash, quality_gate_passed, is_overridden, stats, projects(repo_url, org_id)")
    .eq("id", finding.scan_id)
    .single();

  if (sErr || !scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const projectRef = scan.projects as ProjectRefValue;
  const projectRecord = Array.isArray(projectRef) ? (projectRef[0] ?? null) : projectRef;
  const orgId = projectRecord?.org_id ?? undefined;
  if (!orgId) {
    return NextResponse.json({ error: "Workspace not found for scan" }, { status: 404 });
  }
  const auth = await requirePermission(supabase, "suppress:findings", orgId);
  if (isAuthError(auth)) return auth;

  // Enforce suppression limits based on plan
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", orgId)
    .single();
  const effectivePlan = getEffectivePlan({ plan: org?.plan || "free", pro_expires_at: org?.pro_expires_at });
  const caps = getCapabilities(effectivePlan);

  if (isGovernedPlan(effectivePlan) && finding.group_id) {
    return NextResponse.json({
      error: "Exception Governance is enabled for this workspace. Request review from the recurring issue page instead of suppressing directly.",
      code: "EXCEPTION_REQUEST_REQUIRED",
      issue_group_id: finding.group_id,
      issue_url: `/dashboard/issues/${finding.group_id}?requestException=1`,
    }, { status: 409 });
  }

  // Free users must provide an expiry date
  if (!caps.suppressionGovernanceEnabled && !expires_at) {
    return NextResponse.json({
      error: "Free plan requires an expiry date on suppressions. Unlock Workspace access for permanent suppressions.",
      code: "PLAN_REQUIRED",
      buy_url: "/dashboard/billing",
    }, { status: 403 });
  }

  // Enforce per-project suppression limit
  const { count: existingCount } = await supabase
    .from("finding_suppressions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", scan.project_id)
    .is("revoked_at", null);

  if ((existingCount ?? 0) >= caps.maxSuppressionsPerProject) {
    return NextResponse.json({
      error: `Suppression limit reached (${caps.maxSuppressionsPerProject} on ${effectivePlan} plan). Unlock Workspace access for unlimited suppressions.`,
      code: "PLAN_REQUIRED",
      buy_url: "/dashboard/billing",
    }, { status: 403 });
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
        created_by: auth.user.id,
        expires_at
      },
      { onConflict: "project_id,rule_id,line_number,file_path" }
    );

  if (supErr) {
    return serverError(supErr, "Suppression query");
  }

  const { error: upErr } = await supabase
    .from("findings")
    .update({ is_suppressed: true })
    .eq("scan_id", scan.id)
    .eq("rule_id", finding.rule_id)
    .eq("file_path", finding.file_path)
    .eq("line_number", finding.line_number || 0);

  if (upErr) {
    return serverError(upErr, "Update query");
  }

  const { count: unsuppressedNewCount } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("scan_id", scan.id)
    .eq("is_new", true)
    .eq("is_suppressed", false);

  const passed = (unsuppressedNewCount || 0) === 0 || !!scan.is_overridden;

  const stats =
    scan.stats && typeof scan.stats === "object" && !Array.isArray(scan.stats)
      ? scan.stats
      : {};

  const { error: scanUpErr } = await supabase
    .from("scans")
    .update({
      quality_gate_passed: passed,
      stats: { ...stats, new_issues: unsuppressedNewCount || 0 }
    })
    .eq("id", scan.id);

  if (scanUpErr) {
    return serverError(scanUpErr, "Scan update query");
  }

  const repoUrl = projectRecord?.repo_url;

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
