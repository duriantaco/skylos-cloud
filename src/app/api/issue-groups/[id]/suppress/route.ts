import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan, getCapabilities } from "@/lib/entitlements";

type IssueGroupProjectRelation =
  | { org_id?: string | null }
  | Array<{ org_id?: string | null }>
  | null;

type SuppressionFindingRow = {
  rule_id?: string | null;
  file_path?: string | null;
  line_number?: number | null;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : "False positive";
  const expires_at = typeof body.expires_at === "string" ? body.expires_at : null;

  const { data: group, error: gErr } = await supabase
    .from("issue_groups")
    .select("id, project_id, projects(org_id)")
    .eq("id", id)
    .single();

  if (gErr || !group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (!group.project_id) return NextResponse.json({ error: "Group missing project_id" }, { status: 400 });

  const projectRelation = group.projects as IssueGroupProjectRelation;
  const orgId = Array.isArray(projectRelation)
    ? projectRelation[0]?.org_id
    : projectRelation?.org_id;

  if (!orgId) {
    return NextResponse.json({ error: "Group missing organization context" }, { status: 400 });
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

  // Free users must provide an expiry date
  if (!caps.suppressionGovernanceEnabled && !expires_at) {
    return NextResponse.json({
      error: "Free plan requires an expiry date on suppressions. Upgrade to Pro for permanent suppressions.",
      code: "PLAN_REQUIRED",
      buy_url: "/dashboard/billing",
    }, { status: 403 });
  }

  // Enforce per-project suppression limit
  const { count: existingCount } = await supabase
    .from("finding_suppressions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", group.project_id)
    .is("revoked_at", null);

  if ((existingCount ?? 0) >= caps.maxSuppressionsPerProject) {
    return NextResponse.json({
      error: `Suppression limit reached (${caps.maxSuppressionsPerProject} on ${effectivePlan} plan). Upgrade to Pro for unlimited suppressions.`,
      code: "PLAN_REQUIRED",
      buy_url: "/dashboard/billing",
    }, { status: 403 });
  }

  const { data: findings, error: fErr } = await supabase
    .from("findings")
    .select("id, rule_id, file_path, line_number")
    .eq("group_id", id)
    .limit(5000);

  if (fErr)
    return serverError(fErr, "Fetch findings for suppression");
  if (!findings?.length)
    return NextResponse.json({ error: "No findings in group" }, { status: 404 });

  const suppressionRows = findings.map((f: SuppressionFindingRow) => ({
    project_id: group.project_id,
    rule_id: f.rule_id,
    file_path: f.file_path,
    line_number: Number(f.line_number || 0),
    reason,
    created_by: auth.user.id,
    expires_at,
  }));

  const { error: sErr } = await supabase
    .from("finding_suppressions")
    .upsert(suppressionRows, { onConflict: "project_id,rule_id,line_number,file_path" });

  if (sErr)
    return serverError(sErr, "Upsert suppressions");

  const { error: markErr } = await supabase
    .from("findings")
    .update({ is_suppressed: true })
    .eq("group_id", id);

  if (markErr)
    return serverError(markErr, "Mark findings as suppressed");

  const { error: groupErr } = await supabase
    .from("issue_groups")
    .update({ status: "suppressed" })
    .eq("id", id);

  if (groupErr)
    return serverError(groupErr, "Update issue group status");

  return NextResponse.json({ success: true });
}
