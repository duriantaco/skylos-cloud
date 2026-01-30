import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Flame, FileText, AlertTriangle } from "lucide-react";

type FindingRow = {
  file_path: string | null;
  rule_id: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  is_new: boolean | null;
  is_suppressed: boolean | null;
  scan_id: string;
};

function severityWeight(sev: string) {
  const s = (sev || "").toUpperCase();
  if (s === "CRITICAL") 
    return 100;
  if (s === "HIGH") 
    return 40;
  if (s === "MEDIUM") 
    return 10;
  if (s === "LOW") 
    return 3;
  return 5;
}

function shortPath(p: string, max = 52) {
  if (p.length <= max) 
    return p;
  return "…" + p.slice(-(max - 1));
}

export default async function TopHotspotsCard({
  orgId,
  lookbackScans = 30,
  maxFindings = 5000,
}: {
  orgId: string;
  lookbackScans?: number;
  maxFindings?: number;
}) {
  const supabase = await createClient();

  const { data: scans } = await supabase
    .from("scans")
    .select("id, created_at, projects!inner(org_id)")
    .eq("projects.org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(lookbackScans);

  const scanIds = (scans || []).map((s: any) => s.id).filter(Boolean);
  if (scanIds.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Top Hotspots</h3>
          <Flame className="w-4 h-4 text-slate-400" />
        </div>
        <div className="p-6 text-center text-sm text-slate-500">No scans yet.</div>
      </div>
    );
  }

  const { data: findings } = await supabase
    .from("findings")
    .select("file_path, rule_id, severity, is_new, is_suppressed, scan_id")
    .in("scan_id", scanIds)
    .eq("is_suppressed", false)
    .eq("is_new", true)
    .limit(maxFindings);

  const rows: FindingRow[] = (findings || []) as any[];

  const fileAgg = new Map<string, { score: number; count: number; critical: number; high: number }>();
  const ruleAgg = new Map<string, { score: number; count: number; critical: number; high: number }>();

  for (const f of rows) {
    const file = (f.file_path || "").trim() || "unknown";
    const rule = (f.rule_id || "").trim() || "UNKNOWN";
    const w = severityWeight(f.severity);

    const fa = fileAgg.get(file) || { score: 0, count: 0, critical: 0, high: 0 };
    fa.score += w;
    fa.count += 1;
    if ((f.severity || "").toUpperCase() === "CRITICAL") fa.critical += 1;
    if ((f.severity || "").toUpperCase() === "HIGH") fa.high += 1;
    fileAgg.set(file, fa);

    const ra = ruleAgg.get(rule) || { score: 0, count: 0, critical: 0, high: 0 };
    ra.score += w;
    ra.count += 1;
    if ((f.severity || "").toUpperCase() === "CRITICAL") ra.critical += 1;
    if ((f.severity || "").toUpperCase() === "HIGH") ra.high += 1;
    ruleAgg.set(rule, ra);
  }

  const topFiles = Array.from(fileAgg.entries())
    .map(([k, v]) => ({ file: k, ...v }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const topRules = Array.from(ruleAgg.entries())
    .map(([k, v]) => ({ rule: k, ...v }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Top Hotspots</h3>
        <Flame className="w-4 h-4 text-slate-400" />
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-500">
          No unsuppressed <span className="font-medium">new</span> findings in the last {scanIds.length} scan(s).
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Top files */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
              <FileText className="w-4 h-4" />
              Top files (new + unsuppressed)
            </div>

            <div className="space-y-2">
              {topFiles.map((x) => (
                <div key={x.file} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate" title={x.file}>
                      {shortPath(x.file)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {x.count} finding(s) • {x.critical} critical • {x.high} high
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg shrink-0">
                    score {x.score}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top rules */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
              <AlertTriangle className="w-4 h-4" />
              Top rules (new + unsuppressed)
            </div>

            <div className="space-y-2">
              {topRules.map((x) => (
                <div key={x.rule} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{x.rule}</div>
                    <div className="text-xs text-slate-500">
                      {x.count} finding(s) • {x.critical} critical • {x.high} high
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg shrink-0">
                    score {x.score}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="pt-1">
            <Link
              href="/dashboard/projects"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-2"
            >
              View projects
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
