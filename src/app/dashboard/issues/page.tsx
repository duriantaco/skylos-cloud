import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Search } from "lucide-react";

function sevRank(sev: string) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") return 4;
  if (s === "HIGH") return 3;
  if (s === "MEDIUM") return 2;
  return 1;
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

export default async function IssuesInboxPage() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  console.log('[dashboard/issues] getUser:', { user: user?.email ?? null, error: authErr?.message ?? null });
  if (!user) {
    console.log('[dashboard/issues] no user, redirecting to /login');
    return redirect("/login");
  }

  const { data: anyProject } = await supabase
    .from("projects")
    .select("org_id")
    .limit(1)
    .maybeSingle();

  const orgId = anyProject?.org_id;
  if (!orgId) return redirect("/dashboard/projects");

  const { data: groups } = await supabase
    .from("issue_groups")
    .select(`
      id, rule_id, severity, category,
      canonical_file, canonical_line,
      occurrence_count, verification_status,
      last_seen_at, last_seen_scan_id,
      projects!inner(name, repo_url)
    `)
    .eq("org_id", orgId)
    .eq("status", "open")
    .order("last_seen_at", { ascending: false })
    .limit(200);

  const sorted = (groups || []).slice().sort((a: any, b: any) => {
    const d = sevRank(b.severity) - sevRank(a.severity);
    if (d !== 0) return d;
    return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Issue Inbox</h1>
            <p className="text-slate-500 mt-1">
              Open issue groups (root causes). Click one to triage.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="text-sm font-semibold text-gray-700 hover:text-indigo-700"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
            <Search className="w-4 h-4" />
          </div>
          <div className="text-sm text-slate-500">
            (Optional) Add search later; keep inbox simple first.
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No open issues</h2>
            <p className="text-slate-500">Your inbox is empty.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((g: any) => (
              <Link
                key={g.id}
                href={`/dashboard/issues/${g.id}`}
                className="block bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1"><SeverityPill severity={g.severity} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500 font-semibold">
                      {g.projects?.name || "Unknown Project"} • {g.rule_id} • {g.occurrence_count}x
                      {g.verification_status === "VERIFIED" ? " • VERIFIED" : ""}
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900 truncate">
                      {g.category} • {g.canonical_file}:{g.canonical_line}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-gray-700 font-semibold">Open →</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
