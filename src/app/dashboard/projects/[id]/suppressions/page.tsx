import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Slash, Layers } from "lucide-react";

import ProjectSectionTabs from "@/components/ProjectSectionTabs";
import SuppressionsTable from "@/components/suppressions/SuppressionsTable";
import { ensureWorkspace } from "@/lib/ensureWorkspace";

export default async function SuppressionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, orgId, supabase } = await ensureWorkspace();
  const { id } = await params;

  if (!user) return redirect("/login");
  if (!orgId) return redirect("/dashboard");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, repo_url")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
            Project not found.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-slate-900 font-sans">
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Link href={`/dashboard/projects/${id}`} className="text-slate-500 hover:text-slate-900">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-slate-900">{project.name}</div>
                  {project.repo_url ? (
                    <a
                      href={project.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                    >
                      {project.repo_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-5">
                <ProjectSectionTabs projectId={id} active="suppressions" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/projects/${id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Layers className="h-4 w-4" />
                Project Overview
              </Link>
              <Link
                href="/dashboard/scans"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                Scan History
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
            <Slash className="h-3.5 w-3.5" />
            Suppressions
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            Review active suppressions and the audit trail behind them.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Use this page to understand who suppressed a finding, why it was suppressed, and when that decision expires.
            Use project overview for current blockers and recurring issues when you need the long-lived root-cause record.
          </p>
        </div>

        <SuppressionsTable projectId={id} />
      </div>
    </main>
  );
}
