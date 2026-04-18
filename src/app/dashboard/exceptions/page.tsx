import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Download, Lock, ShieldAlert } from "lucide-react";
import { ensureWorkspace } from "@/lib/ensureWorkspace";
import { getEffectivePlan, canUseSuppressionGovernance } from "@/lib/entitlements";
import { loadExceptionRequests } from "@/lib/exception-requests";
import {
  getExceptionStatusLabel,
  type ExceptionRequestStatus,
} from "@/lib/exception-governance";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusPill(status: ExceptionRequestStatus) {
  const styles: Record<string, string> = {
    requested: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    revoked: "bg-slate-100 text-slate-700 border-slate-200",
    expired: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
        styles[status] || "bg-slate-50 text-slate-700 border-slate-200"
      }`}
    >
      {getExceptionStatusLabel(status)}
    </span>
  );
}

export default async function ExceptionRequestsPage() {
  const { user, orgId, supabase } = await ensureWorkspace();
  if (!user) redirect("/login");
  if (!orgId) redirect("/dashboard");

  const { data: organization } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", orgId)
    .single();

  const effectivePlan = getEffectivePlan({
    plan: organization?.plan || "free",
    pro_expires_at: organization?.pro_expires_at,
  });

  if (!canUseSuppressionGovernance(effectivePlan)) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-slate-50 p-12 text-center">
            <Lock className="mx-auto mb-4 h-10 w-10 text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900">Workspace Governance is required</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
              Route risky exceptions through reviewer approval, keep the decision trail in one queue, and export evidence for who allowed what and why.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/workspace-governance"
                className="inline-flex rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                See Workspace Governance
              </Link>
              <Link
                href="/dashboard/billing"
                className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Unlock Workspace Governance
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const requests = await loadExceptionRequests(supabase, orgId, { limit: 100 });
  const pending = requests.filter((request) => request.effective_status === "requested");
  const active = requests.filter((request) => request.effective_status === "approved");
  const expired = requests.filter((request) => request.effective_status === "expired");
  const revoked = requests.filter((request) => request.effective_status === "revoked");

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Exception Queue</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review requests from live issue groups, approve or reject them, and keep the decision trail tied to the recurring issue.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/exception-requests/export"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
            <Link
              href="/dashboard/issues"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Open issues
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending review</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{pending.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active exceptions</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{active.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expired</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{expired.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revoked</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{revoked.length}</div>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <h2 className="text-lg font-semibold text-slate-900">No exception requests yet</h2>
            <p className="mt-1 text-sm text-slate-500">
              Requests will show up here once someone asks to suppress a recurring issue group.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                Reviewer queue
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/exceptions/${request.id}`}
                  className="block px-5 py-4 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {statusPill(request.effective_status)}
                        {request.expires_at ? (
                          <span className="text-[11px] text-slate-500">
                            Expires {formatDate(request.expires_at)}
                          </span>
                        ) : null}
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {request.project?.name || "Unknown project"}
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {request.issue_group?.rule_id || "Unknown rule"} · {request.issue_group?.canonical_file}:{request.issue_group?.canonical_line}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{request.justification}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-500">
                      <div>Requester: {request.requester_email || request.requested_by}</div>
                      <div className="mt-1">Requested: {formatDate(request.requested_at)}</div>
                      {request.reviewer_email ? (
                        <div className="mt-1">Reviewer: {request.reviewer_email}</div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
