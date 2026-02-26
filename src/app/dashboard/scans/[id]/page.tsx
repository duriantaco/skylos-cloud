'use client'

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CheckCircle, XCircle, FileText, ChevronRight, ChevronDown,
  Search, ExternalLink, AlertTriangle, Lock, Unlock, Ban, AlertOctagon, Shield, Terminal, X, ChevronUp,
  Share2, Link2, Check, LinkIcon,
} from "lucide-react";
import FlowVisualizerButton from "@/components/FlowVisualizerButton";
import FixPrButton from "@/components/FixPrButton";

type Scan = {
  id: string;
  commit_hash: string;
  branch: string;
  created_at: string;
  quality_gate_passed: boolean;
  is_overridden: boolean;
  override_reason?: string | null;
  analysis_mode?: "static" | "hybrid" | "agent";
  ai_code_detected?: boolean;
  ai_code_stats?: {
    detected?: boolean;
    indicators?: { type: string; commit: string; detail: string }[];
    ai_files?: string[];
    confidence?: "high" | "medium" | "low";
    gate_passed?: boolean;
    ai_findings_count?: number;
  } | null;
  stats: {
    danger_count?: number;
    new_issues?: number;
    legacy_issues?: number;
    suppressed_new_issues?: number;
    gate?: {
      enabled?: boolean;
      mode?: "zero-new" | "category" | "severity" | "both";
      thresholds?: {
        by_category?: Record<string, number>;
        by_severity?: Record<string, number>;
      };
      unsuppressed_new_by_category?: Record<string, number>;
      unsuppressed_new_by_severity?: Record<string, number>;
    };
  };
  projects?: { name: string; repo_url: string };
  share_token?: string | null;
  is_public?: boolean;
};

type Finding = {
  id: string;
  category: 'SECURITY' | 'QUALITY' | 'DEAD_CODE' | 'SECRET' | 'DEPENDENCY';
  severity: string;
  message: string;
  file_path: string;
  line_number: number;
  rule_id: string;
  snippet?: string | null;
  is_new: boolean;
  is_suppressed: boolean;

  finding_id?: string | null;
  verification_verdict?: "VERIFIED" | "REFUTED" | "UNKNOWN" | null;
  verification_reason?: string | null;
  verification_evidence?: any;
  verified_at?: string | null;

  // Hybrid/agent LLM metadata
  analysis_source?: "static" | "llm" | "static+llm" | null;
  analysis_confidence?: "high" | "medium" | "low" | null;
  llm_verdict?: "TRUE_POSITIVE" | "FALSE_POSITIVE" | "UNCERTAIN" | null;
  llm_rationale?: string | null;
  llm_challenged?: boolean;
  needs_review?: boolean;

  // SCA metadata for DEPENDENCY findings
  sca_metadata?: {
    vuln_id?: string;
    display_id?: string;
    aliases?: string[];
    affected_range?: string;
    fixed_version?: string | null;
    cvss_score?: number | null;
    references?: string[];
    ecosystem?: string;
    package_name?: string;
    package_version?: string;
  } | null;
};

function generateGitHubUrl(repoUrl: string, sha: string, filePath: string, line: number) {
  if (!repoUrl || !sha || sha === 'local') return '#';
  const clean = repoUrl.replace(/\/$/, '').replace('.git', '');
  return `${clean}/blob/${sha}/${filePath}#L${line}`;
}

function VerifyBadge({ verdict }: { verdict?: string | null }) {
  const v = String(verdict || "").toUpperCase();
  if (v === "VERIFIED") {
    return <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">VERIFIED</span>;
  }
  if (v === "REFUTED") {
    return <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-bold">REFUTED</span>;
  }
  if (v === "UNKNOWN") {
    return <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[9px] font-bold">UNKNOWN</span>;
  }
  return null;
}

function SourceBadge({ source }: { source?: string | null }) {
  if (!source || source === "static") return null;
  if (source === "static+llm") {
    return <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">STATIC+LLM</span>;
  }
  if (source === "llm") {
    return <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold">LLM</span>;
  }
  return null;
}

function ConfidenceBadge({ confidence }: { confidence?: string | null }) {
  if (!confidence) return null;
  const styles: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-red-100 text-red-700",
  };
  const style = styles[confidence] || styles.medium;
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${style}`}>{confidence.toUpperCase()}</span>;
}


function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity || '').toUpperCase();
  const styles = {
    CRITICAL: "bg-red-50 text-red-700 ring-red-600/20",
    HIGH: "bg-orange-50 text-orange-700 ring-orange-600/20",
    MEDIUM: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
    LOW: "bg-blue-50 text-blue-700 ring-blue-700/10",
    UNKNOWN: "bg-gray-50 text-gray-700 ring-gray-500/10"
  };
  const activeStyle = styles[s as keyof typeof styles] || styles.UNKNOWN;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ring-1 ring-inset ${activeStyle}`}>
      {s}
    </span>
  );
}

function TabButton({ active, onClick, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out rounded-md flex items-center gap-2.5
        ${active 
          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
          : 'bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'}
      `}
    >
      {label}
      <span className={`
        flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] rounded-full font-bold
        ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}
      `}>
        {count}
      </span>
    </button>
  );
}

type GateStatus = "PASS" | "FAIL" | "OVERRIDDEN";

function rankSeverity(sev: string) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") return 0;
  if (s === "HIGH") return 1;
  if (s === "MEDIUM") return 2;
  return 3;
}

function getGateStatus(scan: Scan): GateStatus {
  if (scan.is_overridden) return "OVERRIDDEN";
  return scan.quality_gate_passed ? "PASS" : "FAIL";
}

function safeNum(x: any, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

// Compact collapsible gate panel
function GatePanel({
  scan,
  findings,
  onJumpToFinding,
  isExpanded,
  onToggle,
}: {
  scan: Scan;
  findings: Finding[];
  onJumpToFinding: (f: Finding) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const status = getGateStatus(scan);
  const gateMeta = scan.stats?.gate;
  const enabled = gateMeta?.enabled !== false;
  const mode = String(gateMeta?.mode || "zero-new");

  const newUnsuppressed = findings.filter((f) => f.is_new && !f.is_suppressed);
  const newSuppressed = findings.filter((f) => f.is_new && f.is_suppressed);
  const legacy = findings.filter((f) => !f.is_new);

  const sevCounts = newUnsuppressed.reduce<Record<string, number>>((acc, f) => {
    const k = String(f.severity || "LOW").toUpperCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const topBlockers = [...newUnsuppressed]
    .sort((a, b) => rankSeverity(a.severity) - rankSeverity(b.severity))
    .slice(0, 3);

  const thresholdsByCat = gateMeta?.thresholds?.by_category || {};
  const cats = ["SECURITY", "SECRET", "QUALITY", "DEAD_CODE"] as const;

  const breakdown = cats.map((cat) => {
    const inCat = findings.filter((f) => f.category === cat);
    const newUns = inCat.filter((f) => f.is_new && !f.is_suppressed).length;
    const newSup = inCat.filter((f) => f.is_new && f.is_suppressed).length;
    const leg = inCat.filter((f) => !f.is_new).length;
    const limit = gateMeta ? safeNum(thresholdsByCat[cat], 0) : null;
    const blocks = !enabled ? false : !gateMeta ? newUns > 0 : (mode === "category" || mode === "both") ? newUns > safeNum(limit, 0) : newUns > 0;
    return { cat, newUns, newSup, leg, limit, blocks };
  }).filter(r => (r.newUns + r.newSup + r.leg) > 0);

  const statusColors = {
    PASS: "border-emerald-200 bg-emerald-50",
    FAIL: "border-red-200 bg-red-50",
    OVERRIDDEN: "border-amber-200 bg-amber-50",
  };

  const statusTextColors = {
    PASS: "text-emerald-700",
    FAIL: "text-red-700",
    OVERRIDDEN: "text-amber-700",
  };

  return (
    <div className={`border-b border-slate-200 bg-white transition-all ${statusColors[status]}`}>
      {/* Collapsed header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 font-bold text-sm ${statusTextColors[status]}`}>
            {status === "PASS" && <CheckCircle className="w-4 h-4" />}
            {status === "FAIL" && <XCircle className="w-4 h-4" />}
            {status === "OVERRIDDEN" && <Unlock className="w-4 h-4" />}
            Quality Gate: {status}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="px-2 py-1 rounded bg-white/80 border border-slate-200">
              <span className="font-semibold text-red-600">{newUnsuppressed.length}</span> blocking
            </span>
            <span className="px-2 py-1 rounded bg-white/80 border border-slate-200">
              <span className="font-semibold">{newSuppressed.length}</span> suppressed
            </span>
            <span className="px-2 py-1 rounded bg-white/80 border border-slate-200">
              <span className="font-semibold text-slate-500">{legacy.length}</span> legacy
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{isExpanded ? "Hide details" : "Show details"}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-4 grid lg:grid-cols-3 gap-4 border-t border-slate-200/50 pt-4">
          {/* Blocking reason */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Why</div>
            {status === "PASS" && (
              <div className="text-sm text-slate-700">No new unsuppressed findings.</div>
            )}
            {status === "OVERRIDDEN" && (
              <div className="text-sm text-slate-700">
                Gate overridden.
                {scan.override_reason && (
                  <span className="block mt-1 text-xs text-slate-500">Reason: {scan.override_reason}</span>
                )}
              </div>
            )}
            {status === "FAIL" && (
              <div className="space-y-2">
                <div className="text-sm text-slate-700 font-medium">
                  {newUnsuppressed.length} new issue{newUnsuppressed.length !== 1 ? 's' : ''} blocking
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(sevCounts)
                    .sort((a, b) => rankSeverity(a) - rankSeverity(b))
                    .map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-slate-100 text-xs font-semibold text-slate-700">
                        {k}: {sevCounts[k]}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Top blockers */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Top blockers</div>
            {topBlockers.length === 0 ? (
              <div className="text-sm text-slate-500">None</div>
            ) : (
              <div className="space-y-1.5">
                {topBlockers.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onJumpToFinding(f)}
                    className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-slate-50 transition text-xs"
                  >
                    <SeverityBadge severity={f.severity} />
                    <span className="font-mono text-slate-600 truncate">{f.rule_id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Breakdown */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">By category</div>
            {breakdown.length === 0 ? (
              <div className="text-sm text-slate-500">No findings.</div>
            ) : (
              <div className="space-y-1">
                {breakdown.map((r) => (
                  <div key={r.cat} className="flex items-center justify-between text-xs py-1">
                    <span className="font-medium text-slate-700">{r.cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{r.newUns}</span>
                      {r.blocks ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">BLOCK</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">OK</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function ScanDetailsPage() {
  const { id } = useParams() as { id: string };

  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'NEW' | 'ALL'>('NEW');
  const [activeTab, setActiveTab] = useState<'ALL' | 'SECURITY' | 'QUALITY' | 'DEAD_CODE' | 'DEPENDENCY' | 'REVIEW'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const [isOverriding, setIsOverriding] = useState(false);
  const [isSuppressing, setIsSuppressing] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("Manual Override");

  const [suppressOpen, setSuppressOpen] = useState(false);
  const [suppressReason, setSuppressReason] = useState("False Positive");
  const [suppressExpiry, setSuppressExpiry] = useState<'NEVER' | '7' | '30' | '90'>('NEVER');

  // Gate panel collapsed by default
  const [gatePanelExpanded, setGatePanelExpanded] = useState(false);

  // Share state
  const [shareLoading, setShareLoading] = useState(false);
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const addDaysIso = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  const shareUrl = scan?.share_token ? `https://skylos.dev/scan/${scan.share_token}` : null;

  const handleShare = async () => {
    if (!scan) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/scans/${scan.id}/share`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.share_token) {
        setScan({ ...scan, share_token: data.share_token, is_public: true });
        setSharePopoverOpen(true);
      } else {
        setToast({ type: "error", message: data.error || "Failed to share" });
      }
    } catch {
      setToast({ type: "error", message: "Failed to share scan" });
    } finally {
      setShareLoading(false);
    }
  };

  const handleUnshare = async () => {
    if (!scan) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/scans/${scan.id}/share`, { method: "DELETE" });
      if (res.ok) {
        setScan({ ...scan, share_token: null, is_public: false });
        setSharePopoverOpen(false);
        setToast({ type: "success", message: "Scan unshared" });
      }
    } catch {
      setToast({ type: "error", message: "Failed to unshare" });
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: scanData } = await supabase
      .from("scans")
      .select("*, share_token, is_public, projects(name, repo_url)")
      .eq("id", id)
      .single();

    if (scanData) {
      setScan(scanData as Scan);
      if (scanData.quality_gate_passed) setViewMode('ALL');
    }

    const { data: findingsData } = await supabase
      .from("findings")
      .select("*")
      .eq("scan_id", id)
      .order("severity");

    if (findingsData) {
      setFindings(findingsData as Finding[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleOverride = () => {
    setOverrideReason("Manual Override");
    setOverrideOpen(true);
  };

  const submitOverride = async () => {
    const reason = overrideReason.trim();
    if (!reason) return;

    setIsOverriding(true);
    try {
      const res = await fetch(`/api/scans/${id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Server rejected override");
      }

      setOverrideOpen(false);
      await fetchData();
      setToast({ type: 'success', message: "Override applied. Gate marked as passed." });
    } catch (e: any) {
      setToast({ type: 'error', message: `Override failed: ${e.message}` });
    } finally {
      setIsOverriding(false);
    }
  };

  const handleSuppress = () => {
    if (!selectedFinding) return;
    setSuppressReason("False Positive");
    setSuppressExpiry('NEVER');
    setSuppressOpen(true);
  };

  const submitSuppress = async () => {
    if (!selectedFinding) return;

    const reasonText = suppressReason.trim();
    if (!reasonText) return;

    const expires_at = suppressExpiry === 'NEVER' ? null : addDaysIso(parseInt(suppressExpiry, 10));

    setIsSuppressing(true);
    try {
      const res = await fetch(`/api/findings/${selectedFinding.id}/suppress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasonText, expires_at })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Server rejected suppression");
      }

      setSuppressOpen(false);
      await fetchData();
      setToast({ type: 'success', message: "Suppressed. Future scans will ignore this signature." });
    } catch (e: any) {
      setToast({ type: 'error', message: `Suppress failed: ${e.message}` });
    } finally {
      setIsSuppressing(false);
    }
  };

  const viewFindings = useMemo(() => {
    return findings.filter(f => {
      if (viewMode === 'NEW') return f.is_new && !f.is_suppressed;
      return true;
    });
  }, [findings, viewMode]);

  const filteredFindings = useMemo(() => {
    return viewFindings.filter(f => {
      if (activeTab === 'REVIEW') {
        if (!f.needs_review) return false;
      } else if (activeTab !== 'ALL') {
        if (activeTab === 'SECURITY') {
          if (f.category !== 'SECURITY' && f.category !== 'SECRET') return false;
        } else if (f.category !== activeTab) {
          return false;
        }
      }
      if (search) {
        const term = search.toLowerCase();
        if (!f.message.toLowerCase().includes(term) && !f.file_path.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [viewFindings, activeTab, search]);

  useEffect(() => {
    if (filteredFindings.length > 0 && !selectedFinding) {
      setSelectedFinding(filteredFindings[0]);
    }
    if (selectedFinding && !filteredFindings.find(f => f.id === selectedFinding.id) && filteredFindings.length > 0) {
      setSelectedFinding(filteredFindings[0]);
    }
  }, [filteredFindings, selectedFinding]);

  const groupedFindings = useMemo(() => {
    const grouped: Record<string, Finding[]> = {};
    filteredFindings.forEach(f => {
      if (!grouped[f.file_path]) grouped[f.file_path] = [];
      grouped[f.file_path].push(f);
    });
    return grouped;
  }, [filteredFindings]);

  useEffect(() => {
    const uniqueFiles = Object.keys(groupedFindings);
    const expandState: Record<string, boolean> = {};
    uniqueFiles.forEach(f => (expandState[f] = true));
    if (Object.keys(expandedFiles).length === 0) setExpandedFiles(expandState);
  }, [Object.keys(groupedFindings).join('|')]);

  const counts = useMemo(() => ({
    ALL: viewFindings.length,
    SECURITY: viewFindings.filter(f => f.category === 'SECURITY' || f.category === 'SECRET').length,
    QUALITY: viewFindings.filter(f => f.category === 'QUALITY').length,
    DEAD_CODE: viewFindings.filter(f => f.category === 'DEAD_CODE').length,
    DEPENDENCY: viewFindings.filter(f => f.category === 'DEPENDENCY').length,
    REVIEW: viewFindings.filter(f => f.needs_review).length,
  }), [viewFindings]);

  const toggleFile = (filePath: string) => {
    setExpandedFiles(prev => ({ ...prev, [filePath]: !prev[filePath] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Loading Analysis...</p>
        </div>
      </div>
    );
  }

  if (!scan) {
    return <div className="min-h-screen bg-slate-50 text-slate-900 p-8">Scan not found</div>;
  }

  const gateFailed = !scan.quality_gate_passed;

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100]">
          <div className={`rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3 max-w-[420px]
            ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            <div className="text-sm font-medium leading-snug">{toast.message}</div>
            <button onClick={() => setToast(null)} className="ml-auto p-1 rounded hover:bg-black/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideOpen && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isOverriding && setOverrideOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">Emergency Override</div>
                  <div className="text-xs text-slate-500 mt-0.5">Marks the gate as passed for this commit.</div>
                </div>
                <button onClick={() => setOverrideOpen(false)} className="ml-auto p-2 rounded-lg hover:bg-slate-50">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Reason</label>
                  <input
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="e.g. Hotfix deploy"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setOverrideOpen(false)} disabled={isOverriding} className="px-3 py-2 rounded-lg text-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                  <button onClick={submitOverride} disabled={isOverriding || !overrideReason.trim()} className="px-3 py-2 rounded-lg text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
                    {isOverriding ? "Applying..." : "Apply Override"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suppress Modal */}
      {suppressOpen && selectedFinding && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isSuppressing && setSuppressOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">Suppress Finding</div>
                  <div className="text-xs text-slate-500 mt-0.5">Persists across future scans.</div>
                </div>
                <button onClick={() => setSuppressOpen(false)} className="ml-auto p-2 rounded-lg hover:bg-slate-50">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 font-mono">
                  {selectedFinding.rule_id} :: {selectedFinding.file_path}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Expiry</label>
                    <select value={suppressExpiry} onChange={(e) => setSuppressExpiry(e.target.value as any)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none">
                      <option value="NEVER">Never</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Reason</label>
                  <textarea value={suppressReason} onChange={(e) => setSuppressReason(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none" placeholder="Why is this safe to ignore?" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setSuppressOpen(false)} disabled={isSuppressing} className="px-3 py-2 rounded-lg text-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                  <button onClick={submitSuppress} disabled={isSuppressing || !suppressReason.trim()} className="px-3 py-2 rounded-lg text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
                    {isSuppressing ? "Saving..." : "Suppress"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER - Compact */}
      <header className="h-14 shrink-0 border-b border-slate-200 bg-white px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Scans</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="font-semibold text-slate-900">{scan.projects?.name}</span>
            <span className="text-xs text-slate-400 font-mono ml-2">{scan.commit_hash?.slice(0, 7)}</span>
            {scan.analysis_mode && scan.analysis_mode !== "static" && (
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold ml-2">
                {scan.analysis_mode.toUpperCase()} MODE
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Share button */}
          <div className="relative">
            <button
              onClick={() => {
                if (scan?.share_token && scan?.is_public) {
                  setSharePopoverOpen(!sharePopoverOpen);
                } else {
                  handleShare();
                }
              }}
              disabled={shareLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <Share2 className="w-3 h-3" />
              {scan?.is_public ? "Shared" : "Share"}
            </button>
            {sharePopoverOpen && shareUrl && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg p-4 z-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Public link</span>
                  <button onClick={handleUnshare} disabled={shareLoading} className="text-[10px] text-red-600 hover:text-red-700 font-medium">
                    Unshare
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 font-mono"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={copyShareUrl}
                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                  >
                    {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Anyone with this link can view this scan report.</p>
              </div>
            )}
          </div>

          {gateFailed && (
            <button
              onClick={handleOverride}
              disabled={isOverriding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow disabled:opacity-50"
            >
              <Unlock className="w-3 h-3" />
              Override
            </button>
          )}
        </div>
      </header>

      {/* GATE PANEL - Collapsible */}
      <GatePanel
        scan={scan}
        findings={findings}
        onJumpToFinding={(f) => {
          setSelectedFinding(f);
          setExpandedFiles(prev => ({ ...prev, [f.file_path]: true }));
          setActiveTab('ALL');
          setViewMode('NEW');
          setSearch('');
          setGatePanelExpanded(false);
        }}
        isExpanded={gatePanelExpanded}
        onToggle={() => setGatePanelExpanded(!gatePanelExpanded)}
      />

      {/* AI Code Assurance Panel */}
      {scan.ai_code_detected && scan.ai_code_stats && (
        <div className="mx-4 mb-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-bold text-purple-900">AI Code Assurance</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                scan.ai_code_stats.gate_passed === true
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : scan.ai_code_stats.gate_passed === false
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-purple-100 text-purple-700 border border-purple-200'
              }`}>
                {scan.ai_code_stats.gate_passed === true ? 'AI ASSURED' :
                 scan.ai_code_stats.gate_passed === false ? 'AI ISSUES FOUND' :
                 'AI CODE DETECTED'}
              </span>
            </div>
            <span className="text-xs text-purple-600">
              {scan.ai_code_stats.confidence} confidence &middot; {scan.ai_code_stats.ai_files?.length || 0} files &middot; {scan.ai_code_stats.indicators?.length || 0} indicators
            </span>
          </div>

          {scan.ai_code_stats.indicators && scan.ai_code_stats.indicators.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {scan.ai_code_stats.indicators.slice(0, 8).map((ind, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-purple-200 text-[10px] text-purple-700">
                  <span className="font-bold">{ind.type}</span>
                  <span className="font-mono text-purple-500">{ind.commit}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIN CONTENT - Takes remaining space */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Findings list */}
        <div className="w-[380px] flex flex-col bg-white border-r border-slate-200">
          <div className="p-3 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Findings</h2>
              <button
                onClick={() => setViewMode(viewMode === 'NEW' ? 'ALL' : 'NEW')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors border bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {viewMode === 'NEW' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {viewMode === 'NEW' ? 'New only' : 'All'}
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <TabButton label="All" active={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')} count={counts.ALL} />
              <TabButton label="Security" active={activeTab === 'SECURITY'} onClick={() => setActiveTab('SECURITY')} count={counts.SECURITY} />
              <TabButton label="Quality" active={activeTab === 'QUALITY'} onClick={() => setActiveTab('QUALITY')} count={counts.QUALITY} />
              <TabButton label="Dead" active={activeTab === 'DEAD_CODE'} onClick={() => setActiveTab('DEAD_CODE')} count={counts.DEAD_CODE} />
              {counts.DEPENDENCY > 0 && (
                <TabButton label="Deps" active={activeTab === 'DEPENDENCY'} onClick={() => setActiveTab('DEPENDENCY')} count={counts.DEPENDENCY} />
              )}
              {counts.REVIEW > 0 && (
                <TabButton label="Review" active={activeTab === 'REVIEW'} onClick={() => setActiveTab('REVIEW')} count={counts.REVIEW} />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {Object.keys(groupedFindings).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <CheckCircle className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-500">No findings</p>
              </div>
            ) : (
              <div className="py-1">
                {Object.entries(groupedFindings).map(([file, fileFindings]) => {
                  const isOpen = expandedFiles[file] ?? true;
                  return (
                    <div key={file}>
                      <button onClick={() => toggleFile(file)} className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors">
                        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                        <span className="text-xs font-medium text-slate-600 truncate font-mono">{file}</span>
                        <span className="ml-auto text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{fileFindings.length}</span>
                      </button>

                      {isOpen && (
                        <div className="pl-3 pr-2 space-y-1 pb-1">
                          {fileFindings.map(f => {
                            const active = selectedFinding?.id === f.id;
                            return (
                              <button
                                key={f.id}
                                onClick={() => setSelectedFinding(f)}
                                className={`w-full text-left p-2.5 rounded-lg border transition-all ${active ? 'bg-slate-900 border-slate-900' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${f.severity === 'CRITICAL' ? 'bg-red-500' : f.severity === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                                    <span className={`text-[10px] font-mono ${active ? 'text-slate-400' : 'text-slate-500'}`}>{f.rule_id}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {!!f.verification_verdict && <VerifyBadge verdict={f.verification_verdict} />}

                                    {f.is_new && !f.is_suppressed && (
                                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded">NEW</span>
                                    )}
                                    {f.is_suppressed && (
                                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[9px] font-bold rounded">IGNORED</span>
                                    )}
                                    {!!f.analysis_source && <SourceBadge source={f.analysis_source} />}
                                    {!!f.analysis_confidence && <ConfidenceBadge confidence={f.analysis_confidence} />}
                                    {f.needs_review && (
                                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded">REVIEW</span>
                                    )}
                                  </div>
                                </div>

                                <p className={`text-xs line-clamp-2 ${active ? 'text-white' : 'text-slate-700'}`}>{f.message}</p>
                                <div className={`mt-1.5 text-[10px] font-mono ${active ? 'text-slate-500' : 'text-slate-400'}`}>L{f.line_number}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Detail pane */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {!selectedFinding ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
              <Shield className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm">Select a finding</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-6 lg:p-8">
              {/* Alert banners */}
              {selectedFinding.is_new && !selectedFinding.is_suppressed && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-red-900">New Violation</div>
                    <p className="text-xs text-red-700 mt-0.5">This blocks the quality gate.</p>
                  </div>
                </div>
              )}

              {selectedFinding.is_suppressed && (
                <div className="mb-6 rounded-lg border border-slate-200 bg-white p-3 flex gap-3 opacity-75">
                  <Ban className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-700">Suppressed</div>
                    <p className="text-xs text-slate-500 mt-0.5">Won't block future gates.</p>
                  </div>
                </div>
              )}

              {/* Header with FlowVisualizerButton */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityBadge severity={selectedFinding.severity} />
                    <span className="font-mono text-xs text-slate-500 px-2 py-0.5 rounded bg-white border border-slate-200">{selectedFinding.rule_id}</span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">{selectedFinding.message}</h1>
                </div>

                {/* Action buttons - Flow + Suppress */}
                <div className="flex items-center gap-2 shrink-0">
                  <FixPrButton findingId={selectedFinding.id} />
                  <FlowVisualizerButton
                    findingId={selectedFinding.id}
                    ruleId={selectedFinding.rule_id}
                    category={selectedFinding.category}
                    repoUrl={scan.projects?.repo_url}
                    commitHash={scan.commit_hash}
                  />
                  
                  {!selectedFinding.is_suppressed && (
                    <button onClick={handleSuppress} disabled={isSuppressing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                      <Ban className="w-3 h-3" />
                      Suppress
                    </button>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white border border-slate-200 text-xs font-mono text-slate-600 mb-6">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {selectedFinding.file_path}
                <span className="text-slate-300">:</span>
                <span className="text-slate-900">{selectedFinding.line_number}</span>
              </div>

              {selectedFinding.verification_verdict && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-900">Verification</div>
                    <VerifyBadge verdict={selectedFinding.verification_verdict} />
                  </div>

                  {selectedFinding.verification_reason && (
                    <div className="mt-2 text-xs text-slate-600">
                      {selectedFinding.verification_reason}
                    </div>
                  )}

                  {selectedFinding.verification_evidence?.chain?.length > 0 && (
                    <div className="mt-3 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto">
                      {selectedFinding.verification_evidence.chain
                        .slice(0, 12)
                        .map((x: any) => x.fn)
                        .join(" → ")}
                    </div>
                  )}
                </div>
              )}

              {/* LLM Analysis (hybrid/agent mode) */}
              {selectedFinding.llm_verdict && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-900">LLM Analysis</div>
                    <div className="flex items-center gap-2">
                      <SourceBadge source={selectedFinding.analysis_source} />
                      <ConfidenceBadge confidence={selectedFinding.analysis_confidence} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-500">Verdict</span>
                      <div className="mt-1 font-mono text-slate-700">{selectedFinding.llm_verdict}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Source</span>
                      <div className="mt-1 font-mono text-slate-700">{selectedFinding.analysis_source}</div>
                    </div>
                  </div>

                  {selectedFinding.llm_rationale && (
                    <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      {selectedFinding.llm_rationale}
                    </div>
                  )}

                  {selectedFinding.llm_challenged && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                      <AlertTriangle className="w-3 h-3" />
                      LLM challenged this finding (may be a false positive)
                    </div>
                  )}
                </div>
              )}

              {/* SCA Vulnerability Detail */}
              {selectedFinding.category === 'DEPENDENCY' && selectedFinding.sca_metadata && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-slate-900">Vulnerability Detail</div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {selectedFinding.sca_metadata.ecosystem || 'Unknown'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                    <div>
                      <span className="font-semibold text-slate-500">CVE / ID</span>
                      <div className="mt-1 font-mono text-slate-900 font-semibold">
                        {selectedFinding.sca_metadata.display_id || selectedFinding.sca_metadata.vuln_id || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Package</span>
                      <div className="mt-1 font-mono text-slate-700">
                        {selectedFinding.sca_metadata.package_name}@{selectedFinding.sca_metadata.package_version}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Affected Range</span>
                      <div className="mt-1 font-mono text-slate-700">
                        {selectedFinding.sca_metadata.affected_range || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Fix Version</span>
                      <div className={`mt-1 font-mono ${selectedFinding.sca_metadata.fixed_version ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        {selectedFinding.sca_metadata.fixed_version || 'No fix available'}
                      </div>
                    </div>
                    {selectedFinding.sca_metadata.cvss_score != null && (
                      <div>
                        <span className="font-semibold text-slate-500">CVSS Score</span>
                        <div className="mt-1 font-mono text-slate-700">{selectedFinding.sca_metadata.cvss_score}</div>
                      </div>
                    )}
                  </div>

                  {selectedFinding.sca_metadata.aliases && selectedFinding.sca_metadata.aliases.length > 0 && (
                    <div className="text-xs mb-3">
                      <span className="font-semibold text-slate-500">Aliases: </span>
                      <span className="font-mono text-slate-600">{selectedFinding.sca_metadata.aliases.join(', ')}</span>
                    </div>
                  )}

                  {selectedFinding.sca_metadata.references && selectedFinding.sca_metadata.references.length > 0 && (
                    <div className="text-xs">
                      <span className="font-semibold text-slate-500 block mb-1">References</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedFinding.sca_metadata.references.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 underline">
                            <ExternalLink className="w-3 h-3" />
                            {new URL(url).hostname}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Code */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">Source</span>
                  {scan.projects?.repo_url && (
                    <a href={generateGitHubUrl(scan.projects.repo_url, scan.commit_hash, selectedFinding.file_path, selectedFinding.line_number)} target="_blank" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition">
                      GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <pre className="p-4 overflow-x-auto text-sm leading-relaxed bg-[#1e1e1e] text-slate-300 font-mono">
                    {selectedFinding.snippet ? (
                      selectedFinding.snippet.split('\n').map((line, i) => {
                        const centerIdx = Math.floor(selectedFinding.snippet!.split('\n').length / 2);
                        const isTargetLine = i === centerIdx;
                        const displayLine = selectedFinding.line_number - centerIdx + i;
                        return (
                          <div key={i} className={`flex ${isTargetLine ? 'bg-red-900/30' : ''}`}>
                            <span className={`w-10 text-right pr-3 select-none shrink-0 ${isTargetLine ? 'text-red-400 font-bold' : 'text-slate-600'}`}>{displayLine}</span>
                            {isTargetLine && <span className="w-1 bg-red-500 shrink-0" />}
                            <span className={`pl-3 ${isTargetLine ? 'text-white' : ''}`}>{line || ' '}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-slate-500 italic">No snippet available.</span>
                    )}
                  </pre>
                </div>
              </div>

              {/* Fix suggestion */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-500" />
                  Fix with CLI
                </h3>
                <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300">
                  skylos {selectedFinding.file_path} --fix
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}