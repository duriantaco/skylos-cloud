import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Search } from "lucide-react";
import { ensureWorkspace } from "@/lib/ensureWorkspace";
import { syncExpiredExceptionRequests } from "@/lib/exception-governance";

type IssueGroupRow = {
  id: string;
  rule_id: string;
  severity: string;
  category: string;
  source?: string | null;
  canonical_file: string | null;
  canonical_line: number | null;
  occurrence_count: number | null;
  verification_status: string | null;
  last_seen_at: string;
  last_seen_scan_id: string | null;
  author_email: string | null;
  status: string;
  projects?: { name: string | null; repo_url: string | null } | null;
};

function sevRank(sev: string) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") 
    return 4;
  if (s === "HIGH") 
    return 3;
  if (s === "MEDIUM") 
    return 2;
  return 1;
}

function SourceBadge({ source }: { source?: string | null }) {
  if (!source || source === "skylos") 
    return null;
  const isClaudeSecurity = source === "claude-code-security";
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        isClaudeSecurity
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {isClaudeSecurity ? "Claude Security" : source}
    </span>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const s = String(severity || "").toUpperCase();
  const cls =
    s === "CRITICAL"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : s === "HIGH"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : s === "MEDIUM"
      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
      : "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {s}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = String(status || "open").toLowerCase();
  const cls =
    normalized === "pending_exception"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : normalized === "suppressed"
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const label =
    normalized === "pending_exception"
      ? "Pending Exception"
      : normalized === "suppressed"
      ? "Suppressed"
      : "Open";

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

export default async function IssuesInboxPage() {
  const { user, orgId, supabase } = await ensureWorkspace();
  if (!user) {
    return redirect("/login");
  }
  if (!orgId) 
    return redirect("/dashboard/projects");

  let needsSuppressedFallback = false;

  try {
    const syncResult = await syncExpiredExceptionRequests(supabase, { orgId });
    if (!syncResult.ok) {
      needsSuppressedFallback = true;
      console.error(
        "Expiry sync returned a non-ok result before loading issue inbox:",
        syncResult.error_code
      );
    }
  } catch (error) {
    needsSuppressedFallback = true;
    console.error("Failed to sync expired exceptions before loading issue inbox:", error);
  }

  const { data: groups } = await supabase
    .from("issue_groups")
    .select(`
      id, rule_id, severity, category, source, status,
      canonical_file, canonical_line,
      occurrence_count, verification_status,
      last_seen_at, last_seen_scan_id,
      author_email,
      projects!inner(name, repo_url)
    `)
    .eq("org_id", orgId)
    .in("status", needsSuppressedFallback ? ["open", "pending_exception", "suppressed"] : ["open", "pending_exception"])
    .order("last_seen_at", { ascending: false })
    .limit(200);

  const normalizedGroups = ((groups || []) as unknown as IssueGroupRow[]).slice();
  const suppressedFallbackIds = new Set<string>();

  if (needsSuppressedFallback) {
    const suppressedGroupIds = normalizedGroups
      .filter((group) => group.status === "suppressed")
      .map((group) => group.id);

    if (suppressedGroupIds.length > 0) {
      const { data: requestRows } = await supabase
        .from("policy_exception_requests")
        .select("issue_group_id, status, expires_at, requested_at")
        .eq("org_id", orgId)
        .in("issue_group_id", suppressedGroupIds)
        .order("requested_at", { ascending: false });

      const latestRequestByGroup = new Map<
        string,
        { status: string | null; expires_at: string | null }
      >();

      for (const row of requestRows || []) {
        if (!row.issue_group_id || latestRequestByGroup.has(row.issue_group_id)) continue;
        latestRequestByGroup.set(row.issue_group_id, {
          status: row.status,
          expires_at: row.expires_at,
        });
      }

      for (const [groupId, request] of latestRequestByGroup.entries()) {
        // If expiry sync failed, prefer showing time-bounded approved exceptions
        // instead of risking hidden expired issues in a stale suppressed state.
        const timeBoundApproved =
          request.status === "approved" && !!request.expires_at;

        if (
          request.status === "revoked" ||
          request.status === "expired" ||
          timeBoundApproved
        ) {
          suppressedFallbackIds.add(groupId);
        }
      }
    }
  }

  const visibleGroups = normalizedGroups
    .filter(
      (group) => group.status !== "suppressed" || suppressedFallbackIds.has(group.id)
    )
    .map((group) =>
      group.status === "suppressed" && suppressedFallbackIds.has(group.id)
        ? { ...group, status: "open" }
        : group
    );

  const sorted = visibleGroups.slice().sort((a, b) => {
    const d = sevRank(b.severity) - sevRank(a.severity);
    if (d !== 0) 
      return d;
    return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recurring Issues</h1>
            <p className="text-slate-500 mt-1">
              Persistent root causes across scans. Open one for recurrence history, ownership, and governed exception requests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/exceptions"
              className="text-sm font-semibold text-slate-700 hover:text-indigo-700"
            >
              Exception Queue
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-gray-700 hover:text-indigo-700"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
            <Search className="w-4 h-4" />
          </div>
          <div className="text-sm text-slate-500">
            This is not the first-stop triage surface. Review the failing scan first, then come here for the recurring record.
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No open issues</h2>
            <p className="text-slate-500">Your issue registry is empty.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((g) => (
              <Link
                key={g.id}
                href={`/dashboard/issues/${g.id}`}
                className="block bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1"><SeverityPill severity={g.severity} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                      <span>
                        {g.projects?.name || "Unknown Project"} • {g.rule_id} • {g.occurrence_count}x
                        {g.verification_status === "VERIFIED" ? " • VERIFIED" : ""}
                        {g.author_email ? ` • ${g.author_email}` : ""}
                      </span>
                      <StatusPill status={g.status} />
                      <SourceBadge source={g.source} />
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900 truncate">
                      {g.category} • {g.canonical_file}:{g.canonical_line}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-gray-700 font-semibold">View record →</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
