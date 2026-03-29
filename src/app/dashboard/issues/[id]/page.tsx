import { redirect, notFound } from "next/navigation";
import IssueDetailClient from "@/components/mission-control/IssueDetailClient";
import { getEffectivePlan } from "@/lib/entitlements";
import { ensureWorkspace } from "@/lib/ensureWorkspace";

export default async function IssueDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const { user, orgId, supabase } = await ensureWorkspace();
  if (!user) {
    redirect("/login");
  }
  if (!orgId) {
    redirect("/dashboard");
  }

  const { id } = await props.params;

  const { data: group, error } = await supabase
    .from("issue_groups")
    .select(`
      id, rule_id, category, severity,
      canonical_file, canonical_line, canonical_snippet,
      occurrence_count, affected_files, verification_status,
      suggested_fix, data_flow,
      status, first_seen_at, last_seen_at,
      project_id, last_seen_scan_id
    `)
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (error || !group) return notFound();

  const { data: organization } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", orgId)
    .single();

  const effectivePlan = getEffectivePlan({
    plan: organization?.plan || "free",
    pro_expires_at: organization?.pro_expires_at || null,
  });

  return (
    <main className="h-[calc(100vh-0px)]">
        <main className="h-[calc(100vh-0px)]">
            <IssueDetailClient group={group} plan={effectivePlan} />
        </main>
    </main>
  );
}
