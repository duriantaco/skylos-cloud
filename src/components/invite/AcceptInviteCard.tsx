'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInviteCard({
  token,
  orgName,
  role,
}: {
  token: string;
  orgName: string;
  role: string;
}) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setAccepting(true);
    setError("");

    try {
      const res = await fetch("/api/team/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invitation");
        return;
      }

      router.push(data.redirect_to || "/dashboard/settings");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        You are about to join <span className="font-semibold">{orgName}</span> as{" "}
        <span className="font-semibold capitalize">{role}</span>.
      </div>

      <button
        onClick={handleAccept}
        disabled={accepting}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {accepting ? "Accepting..." : "Accept Invitation"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
