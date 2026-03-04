import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import IssueDetailClient from "@/components/mission-control/IssueDetailClient";
import { getEffectivePlan } from "@/lib/entitlements";

export default async function IssueDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
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
    .single();

  if (error || !group) return notFound();

  // Get effective plan for gating
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations(plan, pro_expires_at)")
    .eq("user_id", user.id)
    .maybeSingle();

  const org = member?.organizations as any;
  const effectivePlan = getEffectivePlan({
    plan: org?.plan || "free",
    pro_expires_at: org?.pro_expires_at || null,
  });

  return (
    <main className="h-[calc(100vh-0px)]">
        <main className="h-[calc(100vh-0px)]">
            <IssueDetailClient group={group} plan={effectivePlan} />
        </main>
    </main>
  );
}
