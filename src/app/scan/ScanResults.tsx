"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Shield, Terminal, ExternalLink } from "lucide-react";
import Link from "next/link";

type Finding = {
  severity: string;
  category: string;
  message: string;
  file_path: string;
  line_number: number;
  rule_id: string;
};

type ScanResult = {
  score: number;
  riskLevel: string;
  totalFindings: number;
  severityCounts: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number };
  categoryCounts: Record<string, number>;
  topFindings: Finding[];
  repoUrl: string;
  repoName: string;
};

const RISK_CONFIG = {
  "Low Risk": { color: "#34d399", bg: "rgba(52, 211, 153, 0.1)", border: "rgba(52, 211, 153, 0.25)" },
  "Moderate Risk": { color: "#eab308", bg: "rgba(234, 179, 8, 0.1)", border: "rgba(234, 179, 8, 0.25)" },
  "High Risk": { color: "#f97316", bg: "rgba(249, 115, 22, 0.1)", border: "rgba(249, 115, 22, 0.25)" },
  "Critical Risk": { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.25)" },
} as const;

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
};

const CAT_LABELS: Record<string, string> = {
  SECURITY: "Security",
  SECRET: "Secrets",
  QUALITY: "Code Quality",
  DEAD_CODE: "Dead Code",
  DEPENDENCY: "Dependencies",
};

function AnimatedScore({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1200;
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

function ScoreRing({ score, riskLevel }: { score: number; riskLevel: string }) {
  const config = RISK_CONFIG[riskLevel as keyof typeof RISK_CONFIG] || RISK_CONFIG["Moderate Risk"];
  const size = 200;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Score ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={config.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            animation: `score-fill 1.5s cubic-bezier(0.22, 1, 0.36, 1) 300ms forwards`,
            filter: `drop-shadow(0 0 8px ${config.color}80)`,
            ["--target-offset" as string]: offset,
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-black tabular-nums" style={{ color: config.color }}>
          <AnimatedScore value={score} delay={300} />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5 text-white/40">
          risk score
        </div>
      </div>
    </div>
  );
}

export default function ScanResults({
  results,
  onScanAnother,
}: {
  results: ScanResult;
  onScanAnother: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const riskConfig = RISK_CONFIG[results.riskLevel as keyof typeof RISK_CONFIG] || RISK_CONFIG["Moderate Risk"];

  const categories = useMemo(() => {
    return Object.entries(results.categoryCounts)
      .sort(([, a], [, b]) => b - a);
  }, [results.categoryCounts]);

  return (
    <div className={`transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Injected keyframes */}
      <style>{`
        @keyframes score-fill {
          from { stroke-dashoffset: ${2 * Math.PI * 94}; }
          to { stroke-dashoffset: var(--target-offset); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp {
          opacity: 0;
          animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Back button */}
      <button
        onClick={onScanAnother}
        className="animate-fadeUp flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        style={{ animationDelay: "100ms" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Scan another repo
      </button>

      {/* Repo name */}
      <div className="animate-fadeUp text-center mb-2" style={{ animationDelay: "150ms" }}>
        <Link
          href={results.repoUrl}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors"
        >
          {results.repoName}
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Score ring */}
      <div className="animate-fadeUp flex flex-col items-center mb-8" style={{ animationDelay: "200ms" }}>
        <ScoreRing score={results.score} riskLevel={results.riskLevel} />
        <div
          className="mt-4 px-4 py-2 rounded-full text-sm font-bold border"
          style={{
            color: riskConfig.color,
            backgroundColor: riskConfig.bg,
            borderColor: riskConfig.border,
          }}
        >
          {results.riskLevel}
        </div>
      </div>

      {/* Severity breakdown */}
      <div className="animate-fadeUp grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8" style={{ animationDelay: "400ms" }}>
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => {
          const count = results.severityCounts[sev] || 0;
          const color = SEV_COLORS[sev];
          return (
            <div
              key={sev}
              className="rounded-xl p-4 border backdrop-blur-sm transition-all hover:scale-[1.03]"
              style={{
                backgroundColor: count > 0 ? `${color}08` : "rgba(255,255,255,0.03)",
                borderColor: count > 0 ? `${color}25` : "rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: count > 0 ? `0 0 8px ${color}80` : "none",
                  }}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {sev}
                </span>
              </div>
              <div
                className="text-2xl font-black tabular-nums"
                style={{ color: count > 0 ? color : "rgba(255,255,255,0.15)" }}
              >
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div className="animate-fadeUp mb-8" style={{ animationDelay: "500ms" }}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">
            By Category
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map(([cat, count]) => (
              <span
                key={cat}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60"
              >
                {CAT_LABELS[cat] || cat}: <span className="font-bold text-white/80">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top findings */}
      {results.topFindings.length > 0 && (
        <div className="animate-fadeUp" style={{ animationDelay: "600ms" }}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">
            Top Findings
          </h3>
          <div className="space-y-2">
            {results.topFindings.map((f, i) => {
              const color = SEV_COLORS[f.severity.toUpperCase()] || SEV_COLORS.LOW;
              return (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${color}12`,
                        color: color,
                        border: `1px solid ${color}25`,
                      }}
                    >
                      {f.severity.toUpperCase()}
                    </span>
                    <span className="font-mono text-[11px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                      {f.rule_id}
                    </span>
                    <span className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                      {CAT_LABELS[f.category] || f.category}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{f.message}</p>
                  <p className="text-[11px] text-white/30 font-mono mt-1 truncate">
                    {f.file_path}
                    {f.line_number > 0 ? `:${f.line_number}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Zero findings celebration */}
      {results.totalFindings === 0 && (
        <div className="animate-fadeUp text-center py-10" style={{ animationDelay: "500ms" }}>
          <div className="text-5xl mb-4">{"\\u2728"}</div>
          <p className="text-xl font-bold text-white/80">Clean scan</p>
          <p className="text-sm text-white/40 mt-1">No issues found. Ship it.</p>
        </div>
      )}

      {/* CTA */}
      <div className="animate-fadeUp mt-12" style={{ animationDelay: "800ms" }}>
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-white/40" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/40">
              Want this as a PR gate?
            </span>
          </div>
          <div className="bg-slate-950 rounded-xl px-5 py-3 inline-block border border-white/10">
            <code className="text-sm text-green-400 font-mono">
              pip install skylos && skylos cicd init
            </code>
          </div>
          <p className="text-[11px] text-white/30 mt-3">
            Run in CI/CD to block PRs that introduce new security issues
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Link
              href="https://github.com/duriantaco/skylos"
              className="text-xs font-semibold text-white/50 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/25 hover:bg-white/5"
            >
              GitHub
            </Link>
            <Link
              href="https://pypi.org/project/skylos/"
              className="text-xs font-semibold text-white/50 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/25 hover:bg-white/5"
            >
              PyPI
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
