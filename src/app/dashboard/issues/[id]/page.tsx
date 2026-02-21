import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import IssueDetailClient from "@/components/mission-control/IssueDetailClient";

export default async function IssueDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  console.log('[dashboard/issues/[id]] getUser:', { user: user?.email ?? null, error: authErr?.message ?? null });
  if (!user) {
    console.log('[dashboard/issues/[id]] no user, redirecting to /login');
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

  return (
    <main className="h-[calc(100vh-0px)]">
        <main className="h-[calc(100vh-0px)]">
            <IssueDetailClient group={group} />
        </main>
    </main>
  );
}
