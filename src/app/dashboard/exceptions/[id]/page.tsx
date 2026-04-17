import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock3, ShieldCheck, ShieldX } from "lucide-react";
import { ensureWorkspace } from "@/lib/ensureWorkspace";
import { getEffectivePlan, canUseSuppressionGovernance } from "@/lib/entitlements";
import { loadExceptionRequestDetail } from "@/lib/exception-requests";
import ExceptionDecisionActions from "@/components/exceptions/ExceptionDecisionActions";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function eventLabel(eventType: string) {
  if (eventType === "approved") return { icon: ShieldCheck, color: "text-emerald-600", label: "Approved" };
  if (eventType === "rejected") return { icon: ShieldX, color: "text-rose-600", label: "Rejected" };
  return { icon: Clock3, color: "text-amber-600", label: "Requested" };
}

export default async function ExceptionRequestDetailPage(
  props: { params: Promise<{ id: string }> }
) {
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
    return redirect("/dashboard/billing");
  }

  const { id } = await props.params;
  const detail = await loadExceptionRequestDetail(supabase, orgId, id);
  if (!detail.request) notFound();

  const request = detail.request;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Link
              href="/dashboard/exceptions"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to exception queue
            </Link>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">Exception decision trail</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review the request, understand what enforcement will change, and keep the approval record tied to the recurring issue.
            </p>
          </div>
          <Link
            href={`/dashboard/issues/${request.issue_group_id}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open issue
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request context</div>
              <div className="mt-3 space-y-3">
                <div className="text-sm font-semibold text-slate-900">
                  {request.issue_group?.rule_id || "Unknown rule"} · {request.issue_group?.canonical_file}:{request.issue_group?.canonical_line}
                </div>
                <div className="text-sm text-slate-600">
                  Project: <span className="font-medium text-slate-900">{request.project?.name || "Unknown project"}</span>
                </div>
                <div className="text-sm text-slate-600">
                  Requester: <span className="font-medium text-slate-900">{request.requester_email || request.requested_by}</span>
                </div>
                <div className="text-sm text-slate-600">
                  Requested at: <span className="font-medium text-slate-900">{formatDate(request.requested_at)}</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Justification</div>
                  <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{request.justification}</p>
                </div>
                {request.review_reason ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewer note</div>
                    <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{request.review_reason}</p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Decision trail</div>
              <div className="mt-4 space-y-4">
                {detail.events.map((event) => {
                  const EventIcon = eventLabel(event.event_type).icon;
                  const color = eventLabel(event.event_type).color;
                  const label = eventLabel(event.event_type).label;
                  return (
                    <div key={event.id} className="flex gap-3">
                      <div className={`rounded-lg bg-slate-50 p-2 ${color}`}>
                        <EventIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{label}</div>
                        <div className="text-xs text-slate-500">
                          {event.actor_email || event.actor_id} · {formatDate(event.created_at)}
                        </div>
                        {event.payload?.review_reason ? (
                          <p className="mt-1 text-sm text-slate-600">{String(event.payload.review_reason)}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current state</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{request.status}</div>
              <p className="mt-2 text-sm text-slate-500">
                Approving this request will materialize suppressions for the findings in this recurring issue group.
              </p>
            </section>

            {request.status === "requested" ? (
              <ExceptionDecisionActions requestId={request.id} />
            ) : (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Decision recorded</div>
                <p className="mt-1 text-sm text-slate-500">
                  This request has already been {request.status}. Use the issue page and suppression audit for follow-up actions.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
