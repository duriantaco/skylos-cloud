'use client'

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Shield, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, Layers, Eye,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

type DefenseScore = {
  id: string;
  scan_id: string;
  score_pct: number;
  risk_rating: string;
  weighted_score: number;
  weighted_max: number;
  passed: number;
  total: number;
  ops_passed: number;
  ops_total: number;
  ops_score_pct: number;
  ops_rating: string;
  integrations_found: number;
  files_scanned: number;
  created_at: string;
};

type DefenseFinding = {
  id: string;
  plugin_id: string;
  category: string;
  severity: string;
  weight: number;
  passed: boolean;
  location: string | null;
  message: string | null;
  owasp_llm: string | null;
  remediation: string | null;
};

type HistoryPoint = {
  scan_id: string;
  score_pct: number;
  risk_rating: string;
  ops_score_pct: number;
  ops_rating: string;
  integrations_found: number;
  created_at: string;
};

type OwaspEntry = {
  name: string;
  status: string;
  coverage_pct: number | null;
  passed: number;
  total: number;
  plugins: string[];
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity || '').toUpperCase();
  const styles: Record<string, string> = {
    CRITICAL: "bg-red-50 text-red-700 ring-red-600/20",
    HIGH: "bg-orange-50 text-orange-700 ring-orange-600/20",
    MEDIUM: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
    LOW: "bg-blue-50 text-blue-700 ring-blue-700/10",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${styles[s] || styles.MEDIUM}`}>
      {s}
    </span>
  );
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-900">{score}%</span>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="font-bold text-slate-900">{formatDate(d.created_at)}</div>
      <div className="text-sky-600">Defense: {d.score_pct}%</div>
      {d.ops_score_pct !== undefined && (
        <div className="text-slate-500">Ops: {d.ops_score_pct}%</div>
      )}
    </div>
  );
}

export default function DefensePage() {
  const { id } = useParams<{ id: string }>();
  const [latest, setLatest] = useState<DefenseScore | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [findings, setFindings] = useState<DefenseFinding[]>([]);
  const [owaspCoverage, setOwaspCoverage] = useState<Record<string, OwaspEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${id}/defense?range=90`);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();
        setLatest(data.latest || null);
        setHistory(data.history || []);
        setFindings(data.findings || []);
        setOwaspCoverage(data.owaspCoverage || null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">Loading defense data...</div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-sm text-red-600">Error: {error}</div>
    );
  }

  const failedFindings = findings.filter(f => !f.passed && (f.category || '').toLowerCase() === 'defense');
  const passedFindings = findings.filter(f => f.passed && (f.category || '').toLowerCase() === 'defense');
  const opsFindings = findings.filter(f => (f.category || '').toLowerCase() === 'ops');

  return (
    <div className="py-8 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">AI Defense</h2>
        <p className="mt-1 text-sm text-slate-500">
          LLM integrations, defense scoring and OWASP coverage for this project.
        </p>
      </div>
      {!latest ? (
          /* Empty state */
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">No AI Defense data yet</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              Run <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">skylos defend . --upload</code> to scan
              your codebase for LLM integrations and upload defense results.
            </p>
          </div>
        ) : (
          <>
            {/* Hero Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Defense Score Card */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 flex items-center gap-6">
                <ScoreRing score={latest.score_pct} />
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    AI Defense Score
                  </div>
                  <div className={`text-lg font-black ${
                    latest.score_pct >= 90 ? 'text-emerald-600' :
                    latest.score_pct >= 70 ? 'text-blue-600' :
                    latest.score_pct >= 40 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {latest.risk_rating}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {latest.passed}/{latest.total} checks passing &middot; {latest.weighted_score}/{latest.weighted_max} weighted
                  </div>
                </div>
              </div>

              {/* Ops Score */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ops Score</div>
                <div className="text-3xl font-black text-slate-900">{latest.ops_score_pct}%</div>
                <div className={`text-xs font-bold mt-1 ${
                  latest.ops_score_pct >= 80 ? 'text-emerald-600' :
                  latest.ops_score_pct >= 60 ? 'text-blue-600' :
                  latest.ops_score_pct >= 40 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {latest.ops_rating}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {latest.ops_passed}/{latest.ops_total} ops checks
                </div>
              </div>

              {/* Integrations */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Integrations</div>
                <div className="text-3xl font-black text-slate-900">{latest.integrations_found}</div>
                <div className="text-xs text-slate-400 mt-1">LLM call sites detected</div>
                <div className="text-[10px] text-slate-400">{latest.files_scanned} files scanned</div>
              </div>
            </div>

            {/* Trend Chart */}
            {history.length > 1 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-bold text-slate-900">Defense Score Over Time</h2>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="created_at"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score_pct"
                      stroke="#0ea5e9"
                      fill="#e0f2fe"
                      strokeWidth={2}
                      name="Defense Score"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* OWASP Coverage Grid */}
            {owaspCoverage && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-bold text-slate-900">OWASP LLM Top 10 Coverage</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(owaspCoverage).map(([id, info]) => {
                    const statusColors: Record<string, string> = {
                      covered: 'border-emerald-200 bg-emerald-50',
                      partial: 'border-yellow-200 bg-yellow-50',
                      uncovered: 'border-red-200 bg-red-50',
                      not_applicable: 'border-slate-200 bg-slate-50',
                    };
                    const textColors: Record<string, string> = {
                      covered: 'text-emerald-700',
                      partial: 'text-yellow-700',
                      uncovered: 'text-red-700',
                      not_applicable: 'text-slate-400',
                    };
                    const icons: Record<string, any> = {
                      covered: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
                      partial: <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />,
                      uncovered: <XCircle className="w-3.5 h-3.5 text-red-500" />,
                      not_applicable: <Eye className="w-3.5 h-3.5 text-slate-300" />,
                    };
                    return (
                      <div
                        key={id}
                        className={`border rounded-lg p-3 ${statusColors[info.status] || statusColors.not_applicable}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {icons[info.status] || icons.not_applicable}
                          <span className="text-xs font-bold text-slate-900">{id}</span>
                        </div>
                        <div className={`text-[10px] font-semibold ${textColors[info.status] || textColors.not_applicable}`}>
                          {info.name}
                        </div>
                        {info.coverage_pct !== null && info.status !== 'not_applicable' && (
                          <div className="mt-1.5">
                            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  info.status === 'covered' ? 'bg-emerald-500' :
                                  info.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${info.coverage_pct}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              {info.passed}/{info.total} checks &middot; {info.coverage_pct}%
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Defense Findings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Failed Checks */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <h2 className="text-sm font-bold text-slate-900">Missing Defenses</h2>
                  <span className="ml-auto text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    {failedFindings.length}
                  </span>
                </div>
                {failedFindings.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center">All defense checks passing</div>
                ) : (
                  <div className="space-y-2">
                    {failedFindings
                      .sort((a, b) => {
                        const sev: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                        return (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3);
                      })
                      .map((f) => (
                        <div key={f.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-red-50/50 transition">
                          <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{f.plugin_id}</span>
                              <SeverityBadge severity={f.severity} />
                              {f.owasp_llm && (
                                <span className="text-[9px] font-mono text-slate-400">{f.owasp_llm}</span>
                              )}
                              <span className="ml-auto text-[10px] font-bold text-red-500">-{f.weight}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">{f.message}</div>
                            {f.location && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{f.location}</div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Passing Checks */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-bold text-slate-900">Passing Checks</h2>
                  <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {passedFindings.length}
                  </span>
                </div>
                {passedFindings.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center">No checks passing yet</div>
                ) : (
                  <div className="space-y-2">
                    {passedFindings.map((f) => (
                      <div key={f.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-emerald-50/50 transition">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{f.plugin_id}</span>
                            <SeverityBadge severity={f.severity} />
                            <span className="ml-auto text-[10px] font-bold text-emerald-500">+{f.weight}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">{f.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ops Checks */}
            {opsFindings.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-bold text-slate-900">Ops Checks</h2>
                  <span className="text-[10px] text-slate-400 ml-2">Operational best practices — does not affect defense score or CI gating</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {opsFindings.map((f) => (
                    <div
                      key={f.id}
                      className={`border rounded-lg p-3 ${
                        f.passed
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {f.passed ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="text-xs font-bold text-slate-900">{f.plugin_id}</span>
                      </div>
                      <div className="text-[11px] text-slate-600">{f.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
}
