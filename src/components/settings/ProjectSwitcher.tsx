"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";

type ProjectLite = {
  id: string;
  name: string;
  repo_url?: string | null;
};

export default function ProjectSwitcher({
  projects,
  selectedProjectId,
}: {
  projects: ProjectLite[];
  selectedProjectId: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  function onChange(nextId: string) {
    const params = new URLSearchParams(sp?.toString() || "");
    params.set("project", nextId);
    router.push(`/dashboard/settings?${params.toString()}`);
    try {
      localStorage.setItem("skylos:last_project_id", nextId);
    } catch {}
  }

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">You are editing project settings</div>
          <div className="text-xs text-slate-600 mt-0.5">
            Make sure you've selected the correct project before making changes.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <select
            value={selectedProjectId}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.repo_url ? `(${p.repo_url.split('/').slice(-1)[0]})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-medium border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Editing: {selected?.name ?? "—"}
        </span>
        {selected?.repo_url && (
          <a 
            href={selected.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900 transition"
          >
            {selected.repo_url.replace('https://github.com/', '')}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-mono">
          ID: {selectedProjectId.slice(0, 8)}...
        </span>
      </div>
    </div>
  );
}