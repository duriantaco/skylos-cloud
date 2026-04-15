import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ShieldAlert } from "lucide-react";

import { ensureWorkspace } from "@/lib/ensureWorkspace";

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
};

function sevRank(sev: string) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") return 4;
  if (s === "HIGH") return 3;
  if (s === "MEDIUM") return 2;
  return 1;
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function SourceBadge({ source }: { source?: string | null }) {
  if (!source || source === "skylos") return null;
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

export default async function ProjectIssuesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, orgId, supabase } = await ensureWorkspace();
  const { id } = await params;

  if (!user) return redirect("/login");
  if (!orgId) return redirect("/dashboard");

  const { data: groups } = await supabase
    .from("issue_groups")
    .select(`
      id, rule_id, severity, category, source,
      canonical_file, canonical_line,
      occurrence_count, verification_status,
      last_seen_at, last_seen_scan_id,
      author_email
    `)
    .eq("org_id", orgId)
    .eq("project_id", id)
    .eq("status", "open")
    .order("last_seen_at", { ascending: false })
    .limit(200);

  const sorted = ((groups || []) as IssueGroupRow[]).slice().sort((a, b) => {
    const d = sevRank(b.severity) - sevRank(a.severity);
    if (d !== 0) return d;
    return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
  });

  return (
    <div className="py-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Project issues</h2>
        <p className="mt-1 text-sm text-slate-500">
          Recurring issue records for this project. Open any record for ownership, history, and verification context.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No open project issues</h3>
          <p className="mt-1 text-sm text-slate-500">
            Review new uploads first. Recurring issue records appear here once Skylos groups matching findings over time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((group) => (
            <Link
              key={group.id}
              href={`/dashboard/issues/${group.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50/60"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 shrink-0">
                  <SeverityPill severity={group.severity} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>
                      {group.rule_id} • {group.occurrence_count || 0}x
                      {group.verification_status === "VERIFIED" ? " • VERIFIED" : ""}
                      {group.author_email ? ` • ${group.author_email}` : ""}
                    </span>
                    <SourceBadge source={group.source} />
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                    {group.category} • {group.canonical_file}:{group.canonical_line}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Last seen {timeAgo(group.last_seen_at)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Open record
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
