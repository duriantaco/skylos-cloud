import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Shield,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

import ProjectTrendChart from "@/components/ProjectTrendChart";
import { FileHotspotChart, TopViolationsChart } from "@/components/AdvanceCharts";
import ScanActions from "@/components/ScanActions";

type ScanRow = {
  id: string;
  created_at: string;
  branch?: string | null;
  commit_hash?: string | null;
  quality_gate_passed?: boolean | null;
  is_overridden?: boolean | null;
  stats?: any;
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // ---- Load project
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, name, repo_url")
    .eq("id", id)
    .single();

  if (projectErr || !project) {
    return (
      <main className="min-h-screen bg-gray-50 text-slate-900 font-sans">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="text-sm text-slate-600">Project not found.</div>
        </div>
      </main>
    );
  }

  // ---- Load scans (latest 50)
  const { data: scansRaw } = await supabase
    .from("scans")
    .select("id, created_at, branch, commit_hash, quality_gate_passed, is_overridden, stats")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const scans: ScanRow[] = (scansRaw || []) as any[];

  const latestScan = scans[0] || null;

  // ---- Load latest scan findings for charts
  let latestFindings: any[] = [];
  if (latestScan?.id) {
    const { data: findingsRaw } = await supabase
      .from("findings")
      .select(
        "id, rule_id, file_path, line_number, message, severity, category, is_new, is_suppressed"
      )
      .eq("scan_id", latestScan.id)
      .limit(5000);

    latestFindings = findingsRaw || [];
  }

  return (
    <main className="min-h-screen bg-gray-50 text-slate-900 font-sans">
      {/* Top Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="text-slate-500 hover:text-slate-900 transition"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0">
              <div className="font-bold text-lg text-slate-900 truncate">
                {project.name || "Project"}
              </div>
              {project.repo_url ? (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                  title="Open repository"
                >
                  {project.repo_url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <div className="text-xs text-slate-400">No repo_url</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/projects/${id}/suppressions`}
              className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-sm font-medium"
              title="Suppression audit + revoke"
            >
              Suppressions
            </Link>

            <Link
              href={`/dashboard/settings?project=${id}`}
              className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-sm font-medium inline-flex items-center gap-2"
              title="Project settings"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>

          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-slate-700" />
              <div>
                <div className="text-sm font-bold text-slate-900">Latest Gate</div>
                <div className="text-xs text-slate-500">
                  {latestScan
                    ? `Scan ${latestScan.id.slice(0, 8)} · ${new Date(
                        latestScan.created_at
                      ).toLocaleString()}`
                    : "No scans yet"}
                </div>
              </div>
            </div>

            {latestScan ? (
              <div className="flex items-center gap-3">
                {latestScan.is_overridden ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    OVERRIDDEN
                  </span>
                ) : latestScan.quality_gate_passed ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold">
                    <CheckCircle className="w-4 h-4" />
                    PASS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-800 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    FAIL
                  </span>
                )}

                <Link
                  href={`/dashboard/scans/${latestScan.id}`}
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition"
                >
                  Open latest scan
                </Link>
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                Run your first scan to see gate history.
              </div>
            )}
          </div>
        </div>

        {/* Trend chart */}
        <div className="mb-10">
          <ProjectTrendChart scans={scans || []} />
        </div>

        {/* Charts based on latest findings */}
        {latestFindings.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <FileHotspotChart findings={latestFindings} />
            <TopViolationsChart findings={latestFindings} />
          </div>
        ) : (
          <div className="mb-10 bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-sm text-slate-600">
            No findings yet (or none loaded). Once you upload a scan, charts will appear here.
          </div>
        )}

        {/* Recent scans list */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div className="font-semibold text-slate-900">Recent scans</div>
            <div className="text-xs text-slate-500">{scans.length} shown</div>
          </div>

          {scans.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No scans yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="text-left py-3 px-6">Time</th>
                    <th className="text-left py-3 px-6">Branch</th>
                    <th className="text-left py-3 px-6">Commit</th>
                    <th className="text-left py-3 px-6">Gate</th>
                    <th className="text-right py-3 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => {
                    const gate =
                      s.is_overridden ? "OVERRIDDEN" : s.quality_gate_passed ? "PASS" : "FAIL";
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition"
                      >
                        <td className="py-3 px-6 text-slate-700">
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-slate-700">{s.branch || "—"}</td>
                        <td className="py-3 px-6 font-mono text-slate-700">
                          {(s.commit_hash || "").slice(0, 7) || "—"}
                        </td>
                        <td className="py-3 px-6">
                          <span
                            className={[
                              "inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-bold",
                              gate === "PASS"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : gate === "OVERRIDDEN"
                                  ? "border-amber-200 bg-amber-50 text-amber-900"
                                  : "border-red-200 bg-red-50 text-red-800",
                            ].join(" ")}
                          >
                            {gate}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/scans/${s.id}`}
                              className="text-slate-600 hover:text-slate-900 font-medium"
                            >
                              View
                            </Link>
                            <ScanActions scanId={s.id} scanCommit={s.commit_hash} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
