'use client'

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, GitBranch, GitCommit,
  CheckCircle2, XCircle, Plus, Minus, Equal,
  AlertTriangle, Shield, Search, ChevronDown, ChevronUp,
  ArrowDownUp,
} from "lucide-react";

type ScanOption = {
  id: string;
  created_at: string;
  commit_hash: string | null;
  branch: string | null;
  quality_gate_passed: boolean | null;
  stats: { new_issues?: number; legacy_issues?: number; total?: number } | null;
  projects: { id: string; name: string } | null;
};

type DiffFinding = {
  id: string;
  rule_id: string;
  category: string;
  severity: string;
  message: string;
  file_path: string;
  line_number: number;
  snippet?: string | null;
};

type DiffResult = {
  scan_a: { id: string; created_at: string; commit_hash: string; branch: string; total_findings: number };
  scan_b: { id: string; created_at: string; commit_hash: string; branch: string; total_findings: number };
  new_findings: DiffFinding[];
  resolved_findings: DiffFinding[];
  unchanged_count: number;
  summary: {
    new_count: number;
    resolved_count: number;
    unchanged_count: number;
    new_by_severity: Record<string, number>;
    resolved_by_severity: Record<string, number>;
    delta: number;
  };
};

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity || "").toUpperCase();
  const styles: Record<string, string> = {
    CRITICAL: "bg-red-50 text-red-700 ring-red-600/20",
    HIGH: "bg-orange-50 text-orange-700 ring-orange-600/20",
    MEDIUM: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
    LOW: "bg-blue-50 text-blue-700 ring-blue-700/10",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ring-1 ring-inset ${styles[s] || "bg-gray-50 text-gray-700 ring-gray-500/10"}`}>
      {s}
    </span>
  );
}

function SeverityBar({ counts, color }: { counts: Record<string, number>; color: string }) {
  const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-yellow-500",
    LOW: "bg-blue-400",
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 flex rounded-full overflow-hidden h-2.5 bg-slate-100">
        {order.map((sev) => {
          const count = counts[sev] || 0;
          if (count === 0) return null;
          return (
            <div
              key={sev}
              className={`${colors[sev]} transition-all`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${sev}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
        {order.map((sev) => {
          const count = counts[sev] || 0;
          if (count === 0) return null;
          return (
            <span key={sev} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${colors[sev]}`} />
              {count} {sev.toLowerCase()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ScanSelector({
  label,
  scans,
  selectedId,
  onSelect,
  otherSelectedId,
}: {
  label: string;
  scans: ScanOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  otherSelectedId: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = scans.find((s) => s.id === selectedId);

  return (
    <div className="relative flex-1">
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-4 py-3 text-left hover:border-slate-300 transition"
      >
        {selected ? (
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              {selected.projects?.name}
              <span className="text-xs text-slate-400">{timeAgo(selected.created_at)}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              {selected.branch && (
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {selected.branch}
                </span>
              )}
              {selected.commit_hash && (
                <span className="font-mono">{selected.commit_hash.slice(0, 7)}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-400">Select a scan...</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {scans.map((scan) => {
            const disabled = scan.id === otherSelectedId;
            return (
              <button
                key={scan.id}
                disabled={disabled}
                onClick={() => { onSelect(scan.id); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 border-b border-slate-100 last:border-0 transition ${
                  disabled
                    ? "opacity-40 cursor-not-allowed"
                    : scan.id === selectedId
                    ? "bg-slate-50"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">{scan.projects?.name}</span>
                  <span className="text-xs text-slate-400">{timeAgo(scan.created_at)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  {scan.branch && (
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {scan.branch}
                    </span>
                  )}
                  {scan.commit_hash && (
                    <span className="font-mono">{scan.commit_hash.slice(0, 7)}</span>
                  )}
                  <span>{scan.stats?.total ?? ((scan.stats?.new_issues ?? 0) + (scan.stats?.legacy_issues ?? 0))} findings</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FindingRow({ finding, type }: { finding: DiffFinding; type: "new" | "resolved" }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`border rounded-lg overflow-hidden ${
      type === "new" ? "border-red-200 bg-red-50/30" : "border-emerald-200 bg-emerald-50/30"
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/50 transition"
      >
        <div className={`mt-0.5 shrink-0 ${type === "new" ? "text-red-500" : "text-emerald-500"}`}>
          {type === "new" ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={finding.severity} />
            <span className="text-xs font-mono text-slate-500">{finding.rule_id}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{finding.category}</span>
          </div>
          <p className="text-sm text-slate-800 mt-1.5 line-clamp-1">{finding.message}</p>
          <p className="text-xs text-slate-500 font-mono mt-1">
            {finding.file_path}:{finding.line_number}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
      </button>
      {expanded && finding.snippet && (
        <div className="border-t border-slate-200 bg-slate-900 px-4 py-3">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">{finding.snippet}</pre>
        </div>
      )}
    </div>
  );
}

export default function ScanComparePage() {
  const searchParams = useSearchParams();
  const [scans, setScans] = useState<ScanOption[]>([]);
  const [scanA, setScanA] = useState(searchParams.get("a") || "");
  const [scanB, setScanB] = useState(searchParams.get("b") || "");
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingScans, setLoadingScans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"new" | "resolved">("new");
  const [search, setSearch] = useState("");

  // Load scan list
  useEffect(() => {
    async function loadScans() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      if (!membership) return;

      const { data } = await supabase
        .from("scans")
        .select("id, created_at, commit_hash, branch, quality_gate_passed, stats, projects!inner(id, name, org_id)")
        .eq("projects.org_id", membership.org_id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) {
        setScans(data as unknown as ScanOption[]);
        // Auto-select latest two scans from same project if none specified
        if (!searchParams.get("a") && !searchParams.get("b") && data.length >= 2) {
          // Group by project, pick the one with most scans
          const byProject: Record<string, typeof data> = {};
          for (const s of data) {
            const pid = (s.projects as any)?.id;
            if (pid) {
              if (!byProject[pid]) byProject[pid] = [];
              byProject[pid].push(s);
            }
          }
          const best = Object.values(byProject).sort((a, b) => b.length - a.length)[0];
          if (best && best.length >= 2) {
            setScanA(best[1].id); // older
            setScanB(best[0].id); // newer
          }
        }
      }
      setLoadingScans(false);
    }
    loadScans();
  }, [searchParams]);

  // Run comparison
  async function runCompare() {
    if (!scanA || !scanB) return;
    setLoading(true);
    setError(null);
    setDiff(null);

    try {
      const res = await fetch("/api/scans/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_id_a: scanA, scan_id_b: scanB }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Comparison failed");
      } else {
        setDiff(data);
      }
    } catch {
      setError("Failed to compare scans");
    } finally {
      setLoading(false);
    }
  }

  // Swap scans
  function swapScans() {
    const tmp = scanA;
    setScanA(scanB);
    setScanB(tmp);
    setDiff(null);
  }

  // Filter findings by search
  const filteredNew = useMemo(() => {
    if (!diff) return [];
    if (!search) return diff.new_findings;
    const q = search.toLowerCase();
    return diff.new_findings.filter((f) =>
      f.message.toLowerCase().includes(q) ||
      f.file_path.toLowerCase().includes(q) ||
      f.rule_id.toLowerCase().includes(q)
    );
  }, [diff, search]);

  const filteredResolved = useMemo(() => {
    if (!diff) return [];
    if (!search) return diff.resolved_findings;
    const q = search.toLowerCase();
    return diff.resolved_findings.filter((f) =>
      f.message.toLowerCase().includes(q) ||
      f.file_path.toLowerCase().includes(q) ||
      f.rule_id.toLowerCase().includes(q)
    );
  }, [diff, search]);

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <header>
            <Link
              href="/dashboard/scans"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Scans
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                <ArrowDownUp className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Scan Diff</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                Pro
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              Compare two scans to see what changed — new issues introduced, issues resolved, and what stayed the same.
            </p>
          </header>

          {/* Scan pickers */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            {loadingScans ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading scans...</div>
            ) : (
              <>
                <div className="flex items-end gap-3">
                  <ScanSelector
                    label="Before (older scan)"
                    scans={scans}
                    selectedId={scanA}
                    onSelect={setScanA}
                    otherSelectedId={scanB}
                  />
                  <button
                    onClick={swapScans}
                    className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition mb-0.5"
                    title="Swap scans"
                  >
                    <ArrowDownUp className="w-4 h-4 text-slate-400" />
                  </button>
                  <ScanSelector
                    label="After (newer scan)"
                    scans={scans}
                    selectedId={scanB}
                    onSelect={setScanB}
                    otherSelectedId={scanA}
                  />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={runCompare}
                    disabled={!scanA || !scanB || loading}
                    className="px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {loading ? "Comparing..." : "Compare Scans"}
                  </button>
                  <span className="text-xs text-slate-400">Costs 2 credits</span>
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Results */}
          {diff && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                  <div className={`text-3xl font-bold ${diff.summary.delta > 0 ? "text-red-600" : diff.summary.delta < 0 ? "text-emerald-600" : "text-slate-600"}`}>
                    {diff.summary.delta > 0 ? "+" : ""}{diff.summary.delta}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Net change</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {diff.scan_a.total_findings} &rarr; {diff.scan_b.total_findings}
                  </div>
                </div>

                <div className="bg-white border border-red-200 rounded-xl p-5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Plus className="w-5 h-5 text-red-500" />
                    <span className="text-3xl font-bold text-red-600">{diff.summary.new_count}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">New issues</div>
                </div>

                <div className="bg-white border border-emerald-200 rounded-xl p-5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Minus className="w-5 h-5 text-emerald-500" />
                    <span className="text-3xl font-bold text-emerald-600">{diff.summary.resolved_count}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Resolved</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Equal className="w-5 h-5 text-slate-400" />
                    <span className="text-3xl font-bold text-slate-600">{diff.summary.unchanged_count}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Unchanged</div>
                </div>
              </div>

              {/* Severity breakdown */}
              {diff.summary.new_count > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-xs font-medium text-slate-500 mb-2">New issues by severity</h3>
                  <SeverityBar counts={diff.summary.new_by_severity} color="red" />
                </div>
              )}
              {diff.summary.resolved_count > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-xs font-medium text-slate-500 mb-2">Resolved issues by severity</h3>
                  <SeverityBar counts={diff.summary.resolved_by_severity} color="green" />
                </div>
              )}

              {/* Scan context */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-500 mb-2">Before</div>
                  <div className="flex items-center gap-3 text-sm">
                    {diff.scan_a.branch && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <GitBranch className="w-3.5 h-3.5" />
                        {diff.scan_a.branch}
                      </span>
                    )}
                    {diff.scan_a.commit_hash && (
                      <span className="font-mono text-xs text-slate-500">{diff.scan_a.commit_hash.slice(0, 7)}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{formatDate(diff.scan_a.created_at)}</div>
                  <div className="text-xs text-slate-500 mt-1">{diff.scan_a.total_findings} findings</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-500 mb-2">After</div>
                  <div className="flex items-center gap-3 text-sm">
                    {diff.scan_b.branch && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <GitBranch className="w-3.5 h-3.5" />
                        {diff.scan_b.branch}
                      </span>
                    )}
                    {diff.scan_b.commit_hash && (
                      <span className="font-mono text-xs text-slate-500">{diff.scan_b.commit_hash.slice(0, 7)}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{formatDate(diff.scan_b.created_at)}</div>
                  <div className="text-xs text-slate-500 mt-1">{diff.scan_b.total_findings} findings</div>
                </div>
              </div>

              {/* Findings tabs */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTab("new")}
                      className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition ${
                        tab === "new"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        tab === "new" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                      }`}>
                        {diff.summary.new_count}
                      </span>
                    </button>
                    <button
                      onClick={() => setTab("resolved")}
                      className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition ${
                        tab === "resolved"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      Resolved
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        tab === "resolved" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                      }`}>
                        {diff.summary.resolved_count}
                      </span>
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter findings..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 w-64"
                    />
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  {tab === "new" && (
                    filteredNew.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-sm">
                        {diff.summary.new_count === 0
                          ? "No new issues introduced"
                          : "No findings match your filter"}
                      </div>
                    ) : (
                      filteredNew.map((f) => <FindingRow key={f.id} finding={f} type="new" />)
                    )
                  )}
                  {tab === "resolved" && (
                    filteredResolved.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-sm">
                        {diff.summary.resolved_count === 0
                          ? "No issues were resolved between these scans"
                          : "No findings match your filter"}
                      </div>
                    ) : (
                      filteredResolved.map((f) => <FindingRow key={f.id} finding={f} type="resolved" />)
                    )
                  )}
                </div>
              </div>
            </>
          )}

          {/* Empty state — no diff yet */}
          {!diff && !loading && !error && !loadingScans && (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
              <ArrowDownUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Compare Two Scans</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Select a before and after scan above to see what changed — new issues introduced, old issues resolved, and what stayed the same.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
