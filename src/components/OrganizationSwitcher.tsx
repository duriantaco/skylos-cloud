"use client";

import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

type OrganizationOption = {
  orgId: string;
  name: string;
  role: string;
};

export default function OrganizationSwitcher({
  organizations,
  activeOrgId,
  className = "",
}: {
  organizations: OrganizationOption[];
  activeOrgId: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [selectedOrgId, setSelectedOrgId] = useState(activeOrgId || "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (organizations.length === 0) {
    return null;
  }

  const activeOrg =
    organizations.find((organization) => organization.orgId === selectedOrgId) ||
    organizations[0];

  async function handleChange(nextOrgId: string) {
    if (!nextOrgId || nextOrgId === selectedOrgId) {
      return;
    }

    const previousOrgId = selectedOrgId;
    setSelectedOrgId(nextOrgId);
    setError("");

    try {
      const response = await fetch("/api/org/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: nextOrgId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setSelectedOrgId(previousOrgId);
        setError(data.error || "Failed to switch workspaces.");
        return;
      }

      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } catch {
      setSelectedOrgId(previousOrgId);
      setError("Network error. Please try again.");
    }
  }

  if (organizations.length === 1) {
    return (
      <div className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 ${className}`}>
        <Building2 className="h-4 w-4 text-slate-500" />
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Workspace
          </div>
          <div className="max-w-[180px] truncate text-sm font-semibold text-slate-900">
            {activeOrg.name}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`block ${className}`}>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <Building2 className="h-4 w-4 text-slate-500" />
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Workspace
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedOrgId}
              onChange={(event) => handleChange(event.target.value)}
              disabled={isPending}
              className="w-full truncate bg-transparent text-sm font-semibold text-slate-900 outline-none"
            >
              {organizations.map((organization) => (
                <option key={organization.orgId} value={organization.orgId}>
                  {organization.name}
                </option>
              ))}
            </select>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          </div>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
