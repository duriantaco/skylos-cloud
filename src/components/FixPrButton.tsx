"use client";

import { useState } from "react";
import { GitPullRequest, Loader2 } from "lucide-react";

export default function FixPrButton({ findingId }: { findingId: string }) {
  const [loading, setLoading] = useState(false);

  const handleFix = async () => {
    if (!confirm("This will create a new branch and open a Pull Request with the fix. Continue?")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/findings/${findingId}/fix`, {
        method: "POST",
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      window.open(data.pr_url, "_blank");
      alert("PR Created Successfully!");
    } catch (e: any) {
      alert(`Failed to create PR: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFix}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitPullRequest className="w-3 h-3" />}
      {loading ? "Creating PR..." : "Fix in PR"}
    </button>
  );
}