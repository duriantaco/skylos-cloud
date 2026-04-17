'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExceptionDecisionActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(nextDecision: "approve" | "reject") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exception-requests/${requestId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: nextDecision,
          review_reason: reviewReason.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Decision failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">Reviewer decision</div>
      <p className="mt-1 text-sm text-slate-500">
        Approve to materialize a suppression for this recurring issue group, or reject to keep the issue open.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setDecision("approve")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            decision === "approve"
              ? "bg-emerald-100 text-emerald-700"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setDecision("reject")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            decision === "reject"
              ? "bg-rose-100 text-rose-700"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Reject
        </button>
      </div>

      {decision && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Decision note
            </label>
            <textarea
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder={
                decision === "approve"
                  ? "Why is this exception acceptable?"
                  : "Why is this request being rejected?"
              }
            />
          </div>

          {error && <div className="text-sm text-rose-600">{error}</div>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDecision(null)}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => submit(decision)}
              disabled={loading}
              className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                decision === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading ? "Saving..." : decision === "approve" ? "Approve request" : "Reject request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
