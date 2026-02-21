"use client";

import { useState } from "react";
import { GitPullRequest, Loader2, Sparkles } from "lucide-react";

type Phase = "idle" | "generating" | "creating" | "done" | "error";

export default function FixPrButton({ findingId }: { findingId: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleFix = async () => {
    if (!confirm("This will create a new branch and open a Pull Request with the fix. Continue?")) return;

    setPhase("generating");
    setError(null);

    try {
      const res = await fetch(`/api/findings/${findingId}/fix`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create fix");
      }

      setPhase("creating");
      const data = await res.json();

      setPhase("done");
      window.open(data.pr_url, "_blank");

      // Reset after a moment
      setTimeout(() => setPhase("idle"), 3000);
    } catch (e: any) {
      setError(e.message);
      setPhase("error");
      setTimeout(() => {
        setPhase("idle");
        setError(null);
      }, 5000);
    }
  };

  const isLoading = phase === "generating" || phase === "creating";

  const label = {
    idle: "Fix in PR",
    generating: "Generating fix\u2026",
    creating: "Creating PR\u2026",
    done: "PR Created!",
    error: error ? `Failed: ${error.slice(0, 40)}` : "Failed",
  }[phase];

  const icon = isLoading ? (
    <Loader2 className="w-3 h-3 animate-spin" />
  ) : phase === "done" ? (
    <Sparkles className="w-3 h-3" />
  ) : (
    <GitPullRequest className="w-3 h-3" />
  );

  return (
    <button
      onClick={handleFix}
      disabled={isLoading || phase === "done"}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
        phase === "done"
          ? "bg-emerald-600 text-white"
          : phase === "error"
          ? "bg-rose-600 text-white hover:bg-rose-700"
          : "bg-gray-700 text-white hover:bg-indigo-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
