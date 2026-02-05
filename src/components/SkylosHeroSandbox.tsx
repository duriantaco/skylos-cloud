"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Copy,
  FileText,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

type FindingCategory = "SECURITY" | "QUALITY" | "DEAD_CODE" | "SECRET";
type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

type Finding = {
  id: string;
  category: FindingCategory;
  severity: Severity;
  message: string;
  file_path: string;
  line_number: number;
  rule_id: string;
  snippet?: string | null;
  is_new: boolean;
  is_suppressed: boolean;
  verification_verdict?: "VERIFIED" | "REFUTED" | "UNKNOWN" | null;
};

type DemoExample = {
  id: string;
  name: string;
  description: string;
  code: string;
};

const EXAMPLES: DemoExample[] = [
  {
    id: "sql-injection",
    name: "SQL Injection (HIGH)",
    description: "Tainted input interpolated into SQL execute()",
    code: `from flask import request

def search_users(conn):
    q = request.args.get("q")
    sql = f"SELECT * FROM users WHERE name = '{q}'"
    cur = conn.cursor()
    cur.execute(sql)
    return cur.fetchall()
`,
  },
  {
    id: "hardcoded-secret",
    name: "Hardcoded Secret (CRITICAL)",
    description: "Looks like an API token committed into code",
    code: `import requests

API_KEY = "sk_live_51HxxxxxxSUPERSECRETxxxxx"

def call():
    return requests.get("https://api.example.com", headers={"Authorization": f"Bearer {API_KEY}"})
`,
  },
  {
    id: "unused-import",
    name: "Unused Import (LOW)",
    description: "Import is never referenced",
    code: `import os
import json

def hello():
    return "hi"
`,
  },
  {
    id: "dead-function",
    name: "Dead Function (MEDIUM)",
    description: "Function is defined but never called",
    code: `def helper():
    return 123

def main():
    return "ok"
`,
  },
];

function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity || "").toUpperCase();
  const styles: Record<string, string> = {
    CRITICAL: "bg-red-50 text-red-700 ring-red-600/20",
    HIGH: "bg-orange-50 text-orange-700 ring-orange-600/20",
    MEDIUM: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
    LOW: "bg-blue-50 text-blue-700 ring-blue-700/10",
    UNKNOWN: "bg-gray-50 text-gray-700 ring-gray-500/10",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ring-1 ring-inset ${styles[s] || styles.UNKNOWN}`}>
      {s}
    </span>
  );
}

function VerifyBadge({ verdict }: { verdict?: string | null }) {
  const v = String(verdict || "").toUpperCase();
  if (v === "VERIFIED") return <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">VERIFIED</span>;
  if (v === "REFUTED") return <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-bold">REFUTED</span>;
  if (v === "UNKNOWN") return <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[9px] font-bold">UNKNOWN</span>;
  return null;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeSnippet(code: string, line: number) {
  const lines = code.split("\n");
  const center = Math.max(1, line);
  const start = Math.max(1, center - 4);
  const end = Math.min(lines.length, center + 4);
  return lines.slice(start - 1, end).join("\n");
}

function rankSeverity(sev: string) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") return 0;
  if (s === "HIGH") return 1;
  if (s === "MEDIUM") return 2;
  return 3;
}

function isHighIntent(f: Finding) {
  const cat = f.category;
  const sev = String(f.severity || "").toUpperCase();
  if (cat === "SECRET") return true;
  if (cat === "SECURITY" && (sev === "HIGH" || sev === "CRITICAL")) return true;
  return false;
}

function runQuickDemo(code: string): Finding[] {
  const file_path = "snippet.py";
  const findings: Finding[] = [];
  const lines = code.split("\n");

  const lineOf = (pred: (line: string) => boolean, fallback = 1) => {
    const idx = lines.findIndex(pred);
    return idx >= 0 ? idx + 1 : fallback;
  };

  // Secrets
  const secretPatterns: Array<{ rule: string; re: RegExp; msg: string; sev: Severity }> = [
    { rule: "SKY-S001", re: /\bsk_live_[0-9A-Za-z]{10,}\b/g, msg: "Hardcoded Stripe-like live key in code", sev: "CRITICAL" },
    { rule: "SKY-S002", re: /\bAKIA[0-9A-Z]{16}\b/g, msg: "Hardcoded AWS Access Key ID in code", sev: "CRITICAL" },
    { rule: "SKY-S003", re: /\bghp_[0-9A-Za-z]{20,}\b/g, msg: "Hardcoded GitHub token in code", sev: "HIGH" },
    { rule: "SKY-S004", re: /\b(api[_-]?key|secret|token)\b\s*=\s*["'][^"']{12,}["']/gi, msg: "Suspicious hardcoded secret assignment", sev: "HIGH" },
  ];

  for (const p of secretPatterns) {
    if (p.re.test(code)) {
      const ln = lineOf((l) => p.re.test(l), 1);
      findings.push({
        id: `${p.rule}:${ln}`,
        severity: p.sev,
        category: "SECRET",
        rule_id: p.rule,
        message: p.msg,
        file_path,
        line_number: ln,
        snippet: makeSnippet(code, ln),
        is_new: true,
        is_suppressed: false,
        verification_verdict: null,
      });
    }
  }

  // SQLi
  const hasExecute = /\bexecute\(/.test(code);
  const hasSqlString = /(SELECT|UPDATE|INSERT|DELETE)\s+/i.test(code);
  const hasInterpolation =
    /f\s*["'][^"']*(SELECT|UPDATE|INSERT|DELETE)[^"']*\{[^}]+\}[^"']*["']/i.test(code) ||
    /["'][^"']*(SELECT|UPDATE|INSERT|DELETE)[^"']*%s[^"']*["']\s*%/i.test(code);
  const hasTaintedSource =
    /\brequest\.(args|form|json|get_json)\b/.test(code) || /\bos\.environ\b/.test(code) || /\binput\(/.test(code);

  if (hasExecute && hasSqlString && hasInterpolation && hasTaintedSource) {
    const ln = lineOf((l) => /\bexecute\(/.test(l), 1);
    findings.push({
      id: `SKY-D211:${ln}`,
      severity: "HIGH",
      category: "SECURITY",
      rule_id: "SKY-D211",
      message: "Possible SQL injection: tainted input appears interpolated into SQL execute()",
      file_path,
      line_number: ln,
      snippet: makeSnippet(code, ln),
      is_new: true,
      is_suppressed: false,
      verification_verdict: null,
    });
  }

  // Dead code - imports
  const importMatches = [...code.matchAll(/^\s*import\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*))?\s*$/gm)].map((m) => ({ name: m[2] || m[1], raw: m[0] }));
  const fromImportMatches = [...code.matchAll(/^\s*from\s+[a-zA-Z0-9_.]+\s+import\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*))?\s*$/gm)].map((m) => ({ name: m[2] || m[1], raw: m[0] }));

  for (const imp of [...importMatches, ...fromImportMatches]) {
    const occurrences = (code.match(new RegExp(`\\b${escapeRegExp(imp.name)}\\b`, "g")) || []).length;
    if (occurrences <= 1) {
      const ln = lineOf((l) => l.trim() === imp.raw.trim(), 1);
      findings.push({
        id: `SKY-DC001:${ln}:${imp.name}`,
        severity: "LOW",
        category: "DEAD_CODE",
        rule_id: "SKY-DC001",
        message: `Unused import: '${imp.name}'`,
        file_path,
        line_number: ln,
        snippet: makeSnippet(code, ln),
        is_new: true,
        is_suppressed: false,
        verification_verdict: null,
      });
    }
  }

  // Dead code - functions
  const defMatches = [...code.matchAll(/^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm)].map((m) => m[1]);
  for (const fn of defMatches) {
    const calls = (code.match(new RegExp(`\\b${escapeRegExp(fn)}\\s*\\(`, "g")) || []).length;
    if (calls <= 1) {
      const ln = lineOf((l) => new RegExp(`^\\s*def\\s+${escapeRegExp(fn)}\\s*\\(`).test(l), 1);
      findings.push({
        id: `SKY-DC101:${ln}:${fn}`,
        severity: "MEDIUM",
        category: "DEAD_CODE",
        rule_id: "SKY-DC101",
        message: `Function '${fn}' looks unused (defined but not called)`,
        file_path,
        line_number: ln,
        snippet: makeSnippet(code, ln),
        is_new: true,
        is_suppressed: false,
        verification_verdict: null,
      });
    }
  }

  findings.sort((a, b) => rankSeverity(a.severity) - rankSeverity(b.severity));
  return findings.slice(0, 12);
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export default function SkylosHeroSandbox() {
  const [selected, setSelected] = useState(EXAMPLES[0]!.id);
  const [code, setCode] = useState(EXAMPLES[0]!.code);
  const [findings, setFindings] = useState<Finding[]>(() => runQuickDemo(EXAMPLES[0]!.code));
  const [running, setRunning] = useState(false);

  const [search, setSearch] = useState("");
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({ "snippet.py": true });
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(() => runQuickDemo(EXAMPLES[0]!.code)[0]?.id ?? null);

  const active = useMemo(() => EXAMPLES.find((e) => e.id === selected)!, [selected]);

  const run = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 140));
    const next = runQuickDemo(code);
    setFindings(next);
    setExpandedFiles({ "snippet.py": true });
    setSelectedFindingId(next[0]?.id ?? null);
    setRunning(false);
  };

  const filteredFindings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return findings;
    return findings.filter((f) =>
      f.message.toLowerCase().includes(term) ||
      f.file_path.toLowerCase().includes(term) ||
      f.rule_id.toLowerCase().includes(term)
    );
  }, [findings, search]);

  const groupedFindings = useMemo(() => {
    const grouped: Record<string, Finding[]> = {};
    for (const f of filteredFindings) {
      if (!grouped[f.file_path]) grouped[f.file_path] = [];
      grouped[f.file_path]!.push(f);
    }
    return grouped;
  }, [filteredFindings]);

  const selectedFinding = useMemo(() => {
    if (!selectedFindingId) return null;
    return findings.find((f) => f.id === selectedFindingId) || null;
  }, [findings, selectedFindingId]);

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => ({ ...prev, [filePath]: !(prev[filePath] ?? true) }));
  };

  const uploadCmd = "skylos . --danger --quality --upload";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selected}
              onChange={(e) => {
                const id = e.target.value;
                setSelected(id);
                const ex = EXAMPLES.find((x) => x.id === id)!;
                setCode(ex.code);
                const next = runQuickDemo(ex.code);
                setFindings(next);
                setSelectedFindingId(next[0]?.id ?? null);
                setExpandedFiles({ "snippet.py": true });
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {EXAMPLES.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <span className="text-sm text-slate-500 hidden sm:inline">{active.description}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={run}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              {running ? "Scanning…" : "Scan"}
            </button>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Connect GitHub
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-2 min-h-[560px]">
        {/* Left: Code editor */}
        <div className="border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600 font-mono">snippet.py</span>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full h-full min-h-[280px] rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none"
            />
          </div>
        </div>

        {/* Right: Findings */}
        <div className="bg-slate-50 flex flex-col">
          {/* Findings header */}
          <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Findings</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {findings.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter..."
                className="w-32 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>

          {/* Findings list + detail */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr] min-h-0 overflow-hidden">
            {/* List */}
            <div className="bg-white border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto">
              {Object.keys(groupedFindings).length === 0 ? (
                <div className="p-6 text-center">
                  <ShieldCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No findings</p>
                </div>
              ) : (
                <div className="py-1">
                  {Object.entries(groupedFindings).map(([file, fileFindings]) => {
                    const isOpen = expandedFiles[file] ?? true;
                    return (
                      <div key={file}>
                        <button
                          onClick={() => toggleFile(file)}
                          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors"
                        >
                          {isOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                          <span className="text-xs font-medium text-slate-600 truncate font-mono">{file}</span>
                          <span className="ml-auto text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {fileFindings.length}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="px-2 pb-2 space-y-1">
                            {fileFindings.map((f) => {
                              const isActive = selectedFindingId === f.id;
                              const dot =
                                f.severity === "CRITICAL" ? "bg-red-500" :
                                f.severity === "HIGH" ? "bg-orange-500" :
                                f.severity === "MEDIUM" ? "bg-yellow-500" : "bg-blue-500";

                              return (
                                <button
                                  key={f.id}
                                  onClick={() => setSelectedFindingId(f.id)}
                                  className={`w-full text-left p-2 rounded-lg transition-all ${
                                    isActive
                                      ? "bg-slate-900 text-white"
                                      : "bg-white hover:bg-slate-50 border border-slate-100"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                                    <span className={`text-[10px] font-mono truncate ${isActive ? "text-slate-400" : "text-slate-500"}`}>
                                      {f.rule_id}
                                    </span>
                                    {f.is_new && !f.is_suppressed && (
                                      <span className="ml-auto px-1 py-0.5 bg-red-100 text-red-700 text-[8px] font-bold rounded shrink-0">NEW</span>
                                    )}
                                  </div>
                                  <p className={`text-[11px] line-clamp-2 leading-tight ${isActive ? "text-slate-300" : "text-slate-600"}`}>
                                    {f.message}
                                  </p>
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

            {/* Detail */}
            <div className="p-4 overflow-y-auto">
              {!selectedFinding ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Shield className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-sm">Select a finding</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <SeverityBadge severity={selectedFinding.severity} />
                        <span className="font-mono text-[11px] text-slate-500 px-1.5 py-0.5 rounded bg-white border border-slate-200">
                          {selectedFinding.rule_id}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{selectedFinding.message}</h3>
                    </div>
                    {isHighIntent(selectedFinding) && (
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-mono text-slate-600">
                    <FileText className="w-3 h-3 text-slate-400" />
                    {selectedFinding.file_path}:{selectedFinding.line_number}
                  </div>

                  {/* Code snippet */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200">
                      <span className="text-[11px] font-medium text-slate-600">Source</span>
                    </div>
                    <pre className="p-3 overflow-x-auto text-[11px] leading-relaxed bg-[#1e1e1e] text-slate-300 font-mono">
                      {selectedFinding.snippet ?? "No snippet available."}
                    </pre>
                  </div>

                  {/* CTA */}
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-900">Run on your repo</span>
                    </div>
                    <div className="bg-slate-900 rounded px-2.5 py-1.5 font-mono text-[11px] text-slate-300 mb-2.5 overflow-x-auto">
                      <span className="text-emerald-400">$</span> {uploadCmd}
                    </div>
                    <CopyButton text={uploadCmd} label="Copy command" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Lightweight demo — full scanner uses repo context and 200+ rules.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
        >
          Get started free
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}