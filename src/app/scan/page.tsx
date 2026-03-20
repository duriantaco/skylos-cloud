"use client";

import { useState } from "react";
import { Search, Shield, AlertTriangle, Loader2, Github } from "lucide-react";
import Link from "next/link";
import ScanResults from "./ScanResults";

type ScanResult = {
  score: number;
  riskLevel: string;
  totalFindings: number;
  severityCounts: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number };
  categoryCounts: Record<string, number>;
  topFindings: {
    severity: string;
    category: string;
    message: string;
    file_path: string;
    line_number: number;
    rule_id: string;
  }[];
  repoUrl: string;
  repoName: string;
};

const LOADING_MESSAGES = [
  "Cloning repository...",
  "Analyzing code patterns...",
  "Scanning for dead code...",
  "Checking for hardcoded secrets...",
  "Evaluating code quality...",
  "Computing risk score...",
];

export default function ScanPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResult | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setLoading(true);
    setLoadingStep(0);

    // Cycle through loading messages
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Scan failed. Please try again.");
        return;
      }

      setResults(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Injected animations */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
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

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[160px] opacity-15 bg-blue-500 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 bg-purple-500 pointer-events-none" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Nav bar */}
      <div className="relative z-10 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-5 h-5 rounded bg-white flex items-center justify-center">
              <span className="text-[10px] font-black text-slate-900">S</span>
            </div>
            <span className="text-xs font-medium text-white/60">Skylos</span>
          </Link>
          <Link
            href="https://github.com/duriantaco/skylos"
            className="text-[11px] font-semibold text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/5 flex items-center gap-1.5"
          >
            <Github className="w-3 h-3" />
            Star on GitHub
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-20 pb-16">
        {/* Hero */}
        {!results && (
          <div className="text-center">
            <div className="animate-fadeUp" style={{ animationDelay: "100ms" }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-medium text-white/60">Free. No signup required.</span>
              </div>
            </div>

            <h1
              className="animate-fadeUp text-4xl sm:text-5xl font-black tracking-tight leading-tight"
              style={{ animationDelay: "200ms" }}
            >
              Scan My <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Vibe Code</span>
            </h1>

            <p
              className="animate-fadeUp text-base sm:text-lg text-white/50 mt-4 max-w-lg mx-auto leading-relaxed"
              style={{ animationDelay: "300ms" }}
            >
              Paste a GitHub repo URL. Get a vibe code risk score in seconds.
            </p>

            {/* Scan form */}
            <form
              onSubmit={handleScan}
              className="animate-fadeUp mt-10"
              style={{ animationDelay: "400ms" }}
            >
              <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    disabled={loading}
                    className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="px-6 py-3.5 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10 flex items-center justify-center gap-2 shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Scan
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Loading state */}
            {loading && (
              <div className="animate-fadeIn mt-10">
                <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  {/* Animated dots */}
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-blue-400"
                        style={{
                          animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-white/60 transition-all">
                    {LOADING_MESSAGES[loadingStep]}
                  </p>
                  <p className="text-[10px] text-white/30">This may take up to 60 seconds for larger repos</p>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="animate-fadeUp mt-8 max-w-xl mx-auto">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Feature pills */}
            {!loading && !error && (
              <div
                className="animate-fadeUp mt-16 flex flex-wrap items-center justify-center gap-3"
                style={{ animationDelay: "600ms" }}
              >
                {[
                  "Dead Code",
                  "Hardcoded Secrets",
                  "SQL Injection",
                  "Code Quality",
                  "Dependency Risks",
                ].map((label) => (
                  <span
                    key={label}
                    className="px-3 py-1.5 text-[11px] font-medium text-white/40 bg-white/5 rounded-full border border-white/5"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {results && (
          <ScanResults
            results={results}
            onScanAnother={() => {
              setResults(null);
              setUrl("");
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/5 py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <span className="text-[11px] text-white/30">Powered by Skylos open-source analysis engine</span>
          <Link
            href="https://pypi.org/project/skylos/"
            className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
          >
            pip install skylos
          </Link>
        </div>
      </div>
    </div>
  );
}
