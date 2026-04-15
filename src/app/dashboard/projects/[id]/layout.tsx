import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import ProjectTabs from "@/components/project-tabs";
import { ensureWorkspace } from "@/lib/ensureWorkspace";

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { user, orgId, supabase } = await ensureWorkspace();
  const { id } = await params;

  if (!user) {
    return redirect("/login");
  }
  if (!orgId) {
    return redirect("/dashboard");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, repo_url")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (error || !project) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-3 w-3" /> Projects
          </Link>
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
            Project not found.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 pt-8 pb-5">
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-3 w-3" /> Projects
          </Link>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-[2.1rem] font-semibold tracking-[-0.035em] text-slate-950">
                {project.name || "Project"}
              </h1>
              {project.repo_url ? (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-slate-300 hover:text-slate-900"
                >
                  {project.repo_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <div className="mt-2 text-sm text-slate-400">No repository linked</div>
              )}
            </div>
          </div>
        </div>
        <ProjectTabs projectId={id} />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        {children}
      </div>
    </main>
  );
}
