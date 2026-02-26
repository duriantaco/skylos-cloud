"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type Finding = {
  id: string;
  category: string;
  severity: string;
  message: string;
  file_path: string;
  line_number: number;
  rule_id: string;
  snippet?: string | null;
  is_new: boolean;
  is_suppressed: boolean;
};

type ScanData = {
  id: string;
  commit_hash: string;
  branch: string;
  created_at: string;
  quality_gate_passed: boolean;
  stats: {
    new_issues?: number;
    legacy_issues?: number;
    suppressed_new_issues?: number;
  };
  projectName: string;
};

const SEV_CONFIG = {
  CRITICAL: { color: "#ef4444", glow: "#ef444480", label: "Critical", order: 0 },
  HIGH: { color: "#f97316", glow: "#f9731680", label: "High", order: 1 },
  MEDIUM: { color: "#eab308", glow: "#eab30880", label: "Medium", order: 2 },
  LOW: { color: "#3b82f6", glow: "#3b82f680", label: "Low", order: 3 },
} as const;

type SevKey = keyof typeof SEV_CONFIG;

const CAT_ICONS: Record<string, string> = {
  SECURITY: "\u{1F6E1}",
  SECRET: "\u{1F511}",
  QUALITY: "\u{2728}",
  DEAD_CODE: "\u{1FAA6}",
  DEPENDENCY: "\u{1F4E6}",
};

const CAT_LABELS: Record<string, string> = {
  SECURITY: "Security",
  SECRET: "Secrets",
  QUALITY: "Code Quality",
  DEAD_CODE: "Dead Code",
  DEPENDENCY: "Dependencies",
};

function getSevKey(s: string): SevKey {
  const u = s.toUpperCase();
  if (u in SEV_CONFIG) return u as SevKey;
  return "LOW";
}

// ---------------------------------------------------------------------------
// Animated counter
// ---------------------------------------------------------------------------
function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 800;
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return <>{display}</>;
}

// ---------------------------------------------------------------------------
// Threat Ring — SVG concentric arcs
// ---------------------------------------------------------------------------
function ThreatRing({ counts, passed }: { counts: Record<SevKey, number>; passed: boolean }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;

  const rings: { key: SevKey; radius: number; width: number }[] = [
    { key: "CRITICAL", radius: 90, width: 16 },
    { key: "HIGH", radius: 70, width: 14 },
    { key: "MEDIUM", radius: 52, width: 12 },
    { key: "LOW", radius: 36, width: 10 },
  ];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
        {/* Background rings */}
        {rings.map(({ key, radius, width }) => (
          <circle
            key={`bg-${key}`}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={width}
          />
        ))}

        {/* Animated arcs */}
        {rings.map(({ key, radius, width }, i) => {
          const count = counts[key] || 0;
          if (count === 0 || total === 0) return null;

          const fraction = count / total;
          const circumference = 2 * Math.PI * radius;
          const arcLength = fraction * circumference;
          const config = SEV_CONFIG[key];

          return (
            <circle
              key={key}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={config.color}
              strokeWidth={width}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={circumference}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                animation: `ring-sweep 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${300 + i * 150}ms forwards`,
                filter: `drop-shadow(0 0 6px ${config.glow})`,
              }}
            />
          );
        })}
      </svg>

      {/* Center status */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-3xl font-black tabular-nums"
          style={{ color: passed ? "#34d399" : "#f87171" }}
        >
          <AnimatedNumber value={total} delay={200} />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          findings
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File Heatmap
// ---------------------------------------------------------------------------
function FileHeatmap({ findings }: { findings: Finding[] }) {
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);

  const fileData = useMemo(() => {
    const map = new Map<string, { count: number; worstSev: SevKey; newCount: number }>();
    for (const f of findings) {
      const path = f.file_path;
      const sev = getSevKey(f.severity);
      const existing = map.get(path);
      if (!existing) {
        map.set(path, { count: 1, worstSev: sev, newCount: f.is_new && !f.is_suppressed ? 1 : 0 });
      } else {
        existing.count++;
        if (f.is_new && !f.is_suppressed) existing.newCount++;
        if (SEV_CONFIG[sev].order < SEV_CONFIG[existing.worstSev].order) {
          existing.worstSev = sev;
        }
      }
    }

    return [...map.entries()]
      .sort((a, b) => {
        const sevDiff = SEV_CONFIG[a[1].worstSev].order - SEV_CONFIG[b[1].worstSev].order;
        if (sevDiff !== 0) return sevDiff;
        return b[1].count - a[1].count;
      })
      .slice(0, 60);
  }, [findings]);

  if (fileData.length === 0) return null;

  return (
    <div className="animate-fadeUp" style={{ animationDelay: "600ms" }}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
        File Heatmap
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {fileData.map(([path, data], i) => {
          const config = SEV_CONFIG[data.worstSev];
          const isHovered = hoveredFile === path;
          const size = Math.max(28, Math.min(52, 28 + data.count * 6));
          const fileName = path.split("/").pop() || path;

          return (
            <div
              key={path}
              className="relative group cursor-default transition-all duration-300"
              style={{
                width: size,
                height: size,
                animationDelay: `${700 + i * 20}ms`,
              }}
              onMouseEnter={() => setHoveredFile(path)}
              onMouseLeave={() => setHoveredFile(null)}
            >
              <div
                className="w-full h-full rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: isHovered ? config.color : `${config.color}30`,
                  border: `1px solid ${config.color}50`,
                  boxShadow: isHovered ? `0 0 16px ${config.glow}` : "none",
                  transform: isHovered ? "scale(1.15)" : "scale(1)",
                }}
              />
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                  <div className="bg-slate-900/95 backdrop-blur-sm text-white text-[10px] rounded-lg px-3 py-2 whitespace-nowrap shadow-xl border border-white/10">
                    <div className="font-bold text-xs mb-0.5">{fileName}</div>
                    <div className="text-slate-400 text-[9px] mb-1 max-w-48 truncate">{path}</div>
                    <div className="flex items-center gap-2">
                      <span>{data.count} finding{data.count !== 1 ? "s" : ""}</span>
                      {data.newCount > 0 && (
                        <span className="text-amber-400 font-bold">{data.newCount} new</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category Section
// ---------------------------------------------------------------------------
function CategorySection({ category, findings, index }: { category: string; findings: Finding[]; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  const sorted = useMemo(
    () =>
      [...findings].sort(
        (a, b) => SEV_CONFIG[getSevKey(a.severity)].order - SEV_CONFIG[getSevKey(b.severity)].order
      ),
    [findings]
  );

  const sevBreakdown = useMemo(() => {
    const counts: Partial<Record<SevKey, number>> = {};
    for (const f of findings) {
      const k = getSevKey(f.severity);
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [findings]);

  const newCount = findings.filter((f) => f.is_new && !f.is_suppressed).length;

  return (
    <div
      className="animate-fadeUp rounded-2xl border border-slate-200/80 bg-white overflow-hidden transition-shadow hover:shadow-lg"
      style={{ animationDelay: `${800 + index * 100}ms` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-slate-50/50"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{CAT_ICONS[category] || "\u{1F50D}"}</span>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {CAT_LABELS[category] || category}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {(Object.entries(sevBreakdown) as [SevKey, number][]).map(([sev, count]) => (
                <span
                  key={sev}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${SEV_CONFIG[sev].color}15`,
                    color: SEV_CONFIG[sev].color,
                  }}
                >
                  {count} {SEV_CONFIG[sev].label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {newCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
              {newCount} new
            </span>
          )}
          <span className="text-lg font-black text-slate-300 tabular-nums">{findings.length}</span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {sorted.map((f) => (
            <FindingRow key={f.id} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finding Row
// ---------------------------------------------------------------------------
function FindingRow({ finding }: { finding: Finding }) {
  const [showSnippet, setShowSnippet] = useState(false);
  const sev = getSevKey(finding.severity);
  const config = SEV_CONFIG[sev];

  return (
    <div className="group px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Severity dot */}
        <div className="mt-1.5 shrink-0">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: config.color,
              boxShadow: `0 0 8px ${config.glow}`,
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: `${config.color}12`,
                color: config.color,
                border: `1px solid ${config.color}25`,
              }}
            >
              {finding.severity.toUpperCase()}
            </span>
            <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {finding.rule_id}
            </span>
            {finding.is_new && !finding.is_suppressed && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-600 text-[9px] font-black tracking-wider border border-amber-400/20">
                NEW
              </span>
            )}
            {finding.is_suppressed && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[9px] font-bold line-through">
                SUPPRESSED
              </span>
            )}
          </div>

          <p className="text-sm text-slate-800 mt-1 leading-relaxed">{finding.message}</p>

          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-[11px] text-slate-400 font-mono truncate">
              {finding.file_path}
              {finding.line_number > 0 ? `:${finding.line_number}` : ""}
            </p>
            {finding.snippet && (
              <button
                onClick={() => setShowSnippet(!showSnippet)}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-medium shrink-0 transition-colors"
              >
                {showSnippet ? "hide" : "code"}
              </button>
            )}
          </div>

          {showSnippet && finding.snippet && (
            <pre className="mt-2 text-[11px] bg-slate-950 text-slate-300 rounded-xl p-4 overflow-x-auto font-mono leading-relaxed border border-slate-800 max-h-32">
              {finding.snippet}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------
export default function ScanReportView({ scan, findings }: { scan: ScanData; findings: Finding[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const newUnsuppressed = useMemo(() => findings.filter((f) => f.is_new && !f.is_suppressed), [findings]);
  const suppressed = useMemo(() => findings.filter((f) => f.is_suppressed), [findings]);
  const legacy = useMemo(() => findings.filter((f) => !f.is_new), [findings]);

  const sevCounts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<SevKey, number>;
    for (const f of findings) c[getSevKey(f.severity)]++;
    return c;
  }, [findings]);

  const categories = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of findings) {
      const key = f.category || "UNCATEGORIZED";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return [...map.entries()].sort(([, a], [, b]) => {
      const worstA = Math.min(...a.map((f) => SEV_CONFIG[getSevKey(f.severity)].order));
      const worstB = Math.min(...b.map((f) => SEV_CONFIG[getSevKey(f.severity)].order));
      return worstA - worstB;
    });
  }, [findings]);

  const dateStr = new Date(scan.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`min-h-screen bg-[#f8fafc] transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Inject keyframes */}
      <style>{`
        @keyframes ring-sweep {
          from { stroke-dashoffset: var(--circumference, 565); }
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .animate-fadeUp {
          opacity: 0;
          animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-fadeIn {
          opacity: 0;
          animation: fadeIn 0.4s ease forwards;
        }
      `}</style>

      {/* ─── Hero Section ─── */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />

        {/* Ambient glow based on gate status */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{
            background: scan.quality_gate_passed
              ? "radial-gradient(circle, #34d399, transparent)"
              : "radial-gradient(circle, #f87171, transparent)",
          }}
        />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 bg-blue-500" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10">
          {/* CTA Bar */}
          <div className="border-b border-white/5">
            <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-white flex items-center justify-center">
                  <span className="text-[10px] font-black text-slate-900">S</span>
                </div>
                <span className="text-xs font-medium text-white/60">Skylos Scan Report</span>
              </div>
              <Link
                href="https://skylos.dev"
                className="text-[11px] font-semibold text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/5"
              >
                Get Skylos Free &rarr;
              </Link>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-6xl mx-auto px-6 pt-12 pb-16">
            {/* Project info */}
            <div className="animate-fadeUp" style={{ animationDelay: "100ms" }}>
              <h1 className="text-3xl font-black text-white tracking-tight">{scan.projectName}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  {scan.commit_hash?.slice(0, 7)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  {scan.branch}
                </span>
                <span className="text-xs text-white/30">{dateStr}</span>
              </div>
            </div>

            {/* Ring + Stats Layout */}
            <div className="mt-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
              {/* Threat Ring */}
              <div className="animate-fadeUp shrink-0" style={{ animationDelay: "200ms" }}>
                <ThreatRing counts={sevCounts} passed={scan.quality_gate_passed} />
              </div>

              {/* Stats + Gate */}
              <div className="flex-1 w-full">
                {/* Gate Status */}
                <div
                  className="animate-fadeUp rounded-2xl p-5 mb-6 border backdrop-blur-sm"
                  style={{
                    animationDelay: "300ms",
                    backgroundColor: scan.quality_gate_passed ? "rgba(52, 211, 153, 0.08)" : "rgba(248, 113, 113, 0.08)",
                    borderColor: scan.quality_gate_passed ? "rgba(52, 211, 153, 0.2)" : "rgba(248, 113, 113, 0.2)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                      style={{
                        backgroundColor: scan.quality_gate_passed ? "rgba(52, 211, 153, 0.15)" : "rgba(248, 113, 113, 0.15)",
                        color: scan.quality_gate_passed ? "#34d399" : "#f87171",
                      }}
                    >
                      {scan.quality_gate_passed ? "\u2713" : "\u2717"}
                    </div>
                    <div>
                      <h2
                        className="font-bold text-lg"
                        style={{ color: scan.quality_gate_passed ? "#6ee7b7" : "#fca5a5" }}
                      >
                        Quality Gate {scan.quality_gate_passed ? "Passed" : "Failed"}
                      </h2>
                      <p className="text-xs text-white/40 mt-0.5">
                        {newUnsuppressed.length} new &middot; {suppressed.length} suppressed &middot; {legacy.length} existing
                      </p>
                    </div>
                  </div>
                </div>

                {/* Severity Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as SevKey[]).map((sev, i) => {
                    const config = SEV_CONFIG[sev];
                    const count = sevCounts[sev];
                    return (
                      <div
                        key={sev}
                        className="animate-fadeUp rounded-xl p-4 border backdrop-blur-sm transition-all hover:scale-[1.03]"
                        style={{
                          animationDelay: `${400 + i * 80}ms`,
                          backgroundColor: count > 0 ? `${config.color}08` : "rgba(255,255,255,0.03)",
                          borderColor: count > 0 ? `${config.color}25` : "rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: config.color,
                              boxShadow: count > 0 ? `0 0 8px ${config.glow}` : "none",
                            }}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                            {config.label}
                          </span>
                        </div>
                        <div
                          className="text-2xl font-black tabular-nums"
                          style={{ color: count > 0 ? config.color : "rgba(255,255,255,0.15)" }}
                        >
                          <AnimatedNumber value={count} delay={500 + i * 80} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content Section ─── */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* File Heatmap */}
        {findings.length > 0 && <FileHeatmap findings={findings} />}

        {/* Categories */}
        <div className="mt-10 space-y-3">
          <h3
            className="animate-fadeUp text-xs font-bold uppercase tracking-widest text-slate-400 mb-4"
            style={{ animationDelay: "750ms" }}
          >
            Findings by Category
          </h3>
          {categories.map(([cat, catFindings], i) => (
            <CategorySection key={cat} category={cat} findings={catFindings} index={i} />
          ))}
        </div>

        {findings.length === 0 && (
          <div className="text-center py-20 animate-fadeUp" style={{ animationDelay: "600ms" }}>
            <div className="text-5xl mb-4">{"\u{1F389}"}</div>
            <p className="text-xl font-bold text-slate-700">Clean scan</p>
            <p className="text-sm text-slate-400 mt-1">No issues found. Ship it.</p>
          </div>
        )}

        {/* Footer CTA */}
        <div className="animate-fadeUp mt-16 text-center" style={{ animationDelay: "1000ms" }}>
          <div className="inline-flex flex-col items-center p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-4">
              <span className="text-sm font-black text-slate-900">S</span>
            </div>
            <p className="text-white/80 text-sm mb-1">Automated code security for your team</p>
            <p className="text-white/40 text-xs mb-5">Free to start. No credit card required.</p>
            <Link
              href="https://skylos.dev"
              className="px-6 py-2.5 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-lg"
            >
              Try Skylos Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
