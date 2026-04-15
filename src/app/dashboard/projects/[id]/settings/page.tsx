import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Settings } from "lucide-react";

import { ensureWorkspace } from "@/lib/ensureWorkspace";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, orgId } = await ensureWorkspace();
  const { id } = await params;

  if (!user) return redirect("/login");
  if (!orgId) return redirect("/dashboard");

  return (
    <div className="py-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Project settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure repository, policy, integrations and notifications for this project.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-lg bg-slate-100 p-2.5">
            <Settings className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">Workspace settings</div>
            <p className="mt-1 text-sm text-slate-500">
              Repo URL, policy editor, Slack / Discord integrations, GitHub App, API keys and team are
              configured in workspace settings.
            </p>
            <Link
              href={`/dashboard/settings?project=${id}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Open settings for this project
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
