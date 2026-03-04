"use client";

import { useState } from "react";
import { GitPullRequest, Loader2, Sparkles } from "lucide-react";
import CreditActionButton from "./CreditActionButton";
import { FEATURE_KEYS } from "@/lib/credits";

type Phase = "idle" | "generating" | "creating" | "done" | "error";

export default function FixPrButton({
  findingId,
  plan = "free",
}: {
  findingId: string;
  plan?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleFix = async () => {
    if (
      !confirm(
        "This will create a new branch and open a Pull Request with the fix. Continue?"
      )
    )
      return;

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

  return (
    <CreditActionButton
      featureKey={FEATURE_KEYS.PR_REVIEW}
      label={
        phase === "generating"
          ? "Generating fix\u2026"
          : phase === "creating"
          ? "Creating PR\u2026"
          : phase === "done"
          ? "PR Created!"
          : phase === "error"
          ? `Failed: ${(error || "").slice(0, 40)}`
          : "Fix in PR"
      }
      icon={
        phase === "generating" || phase === "creating" ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : phase === "done" ? (
          <Sparkles className="w-3 h-3" />
        ) : (
          <GitPullRequest className="w-3 h-3" />
        )
      }
      onAction={handleFix}
      plan={plan}
      disabled={phase === "generating" || phase === "creating" || phase === "done"}
      variant={phase === "error" ? "danger" : "primary"}
      proFeatureName="PR Auto-Fix"
      proFeatureDescription="LLM generates a code fix and opens a pull request"
    />
  );
}
