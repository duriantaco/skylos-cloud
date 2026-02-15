"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Code2,
  AlertTriangle,
  GitBranch,
  Loader2,
  BarChart3,
} from "lucide-react";

type TrendDataPoint = {
  date: string;
  commitHash: string | null;
  branch: string | null;
  gatePassed: boolean | null;
  scanId: string;
  security: number;
  quality: number;
  deadCode: number;
  secrets: number;
  total: number;
  newIssues: number;
  legacyIssues: number;
};

type SummaryMetric = {
  current: number;
  previous: number;
  change: number | null;
};

type TrendsData = {
  dataPoints: TrendDataPoint[];
  branches: string[];
  summary: {
    total: SummaryMetric;
    security: SummaryMetric;
    quality: SummaryMetric;
    deadCode: SummaryMetric;
  };
  totalScans: number;
};

type Project = {
  id: string;
  name: string;
};

function StatCard({
  label,
  icon: Icon,
  value,
  change,
  color,
}: {
  label: string;
  icon: any;
  value: number;
  change: number | null;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    red: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
    slate: { bg: "bg-slate-50", text: "text-slate-700", icon: "text-slate-500" },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-slate-900">
          {Math.round(value)}
        </span>
        {change !== null && (
          <span
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              change < 0
                ? "bg-emerald-50 text-emerald-700"
                : change > 0
                ? "bg-red-50 text-red-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {change < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : change > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {change === 0 ? "No change" : `${Math.abs(change)}%`}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1">avg per scan vs prior period</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-slate-900 text-white rounded-lg px-4 py-3 shadow-xl text-xs">
      <p className="font-medium mb-2">
        {new Date(label).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
      {data?.commitHash && (
        <p className="text-slate-400 mb-2 font-mono">{data.commitHash}</p>
      )}
      <div className="space-y-1">
        <p>
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" />
          Security: {data?.security ?? 0}
        </p>
        <p>
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2" />
          Quality: {data?.quality ?? 0}
        </p>
        <p>
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />
          Dead Code: {data?.deadCode ?? 0}
        </p>
      </div>
    </div>
  );
}

export default function TrendsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [range, setRange] = useState("30");
  const [branch, setBranch] = useState("");
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const json = await res.json();
        const list = json.projects || json || [];
        setProjects(list);
        if (list.length > 0 && !selectedProject) {
          setSelectedProject(list[0].id);
        }
      }
    }
    loadProjects();
  }, []);

  // Load trends data
  useEffect(() => {
    if (!selectedProject) return;

    async function loadTrends() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          projectId: selectedProject,
          range,
        });
        if (branch) params.set("branch", branch);

        const res = await fetch(`/api/trends?${params}`);
        if (!res.ok) throw new Error("Failed to load trends");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTrends();
  }, [selectedProject, range, branch]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.dataPoints.map((d) => ({
      ...d,
      dateLabel: new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [data]);

  const scansTable = useMemo(() => {
    if (!data) return [];
    return [...data.dataPoints].reverse().slice(0, 20);
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-slate-400" />
              Trends
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track how your code quality changes over time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Project Picker */}
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setBranch("");
              }}
              className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Branch Picker */}
            {data && data.branches.length > 0 && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                <GitBranch className="w-4 h-4 text-slate-500" />
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">All branches</option>
                  {data.branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
              {[
                { label: "7d", value: "7" },
                { label: "30d", value: "30" },
                { label: "90d", value: "90" },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-2 text-sm font-medium transition ${
                    range === r.value
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
            {error}
          </div>
        ) : !data || data.totalScans === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              No scan data yet
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Upload your first scan to start tracking trends.
            </p>
            <code className="bg-slate-900 text-slate-300 px-4 py-2 rounded-lg text-sm font-mono">
              skylos . --danger --quality --upload
            </code>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Issues"
                icon={BarChart3}
                value={data.summary.total.current}
                change={data.summary.total.change}
                color="slate"
              />
              <StatCard
                label="Security"
                icon={Shield}
                value={data.summary.security.current}
                change={data.summary.security.change}
                color="red"
              />
              <StatCard
                label="Quality"
                icon={AlertTriangle}
                value={data.summary.quality.current}
                change={data.summary.quality.change}
                color="amber"
              />
              <StatCard
                label="Dead Code"
                icon={Code2}
                value={data.summary.deadCode.current}
                change={data.summary.deadCode.change}
                color="blue"
              />
            </div>

            {/* Main Stacked Area Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Issues Over Time
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Stacked view of all finding categories
              </p>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{
                        paddingTop: "20px",
                        fontSize: "12px",
                        color: "#475569",
                      }}
                      iconType="circle"
                    />
                    <Area
                      name="Security"
                      type="monotone"
                      dataKey="security"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef444420"
                      strokeWidth={2}
                    />
                    <Area
                      name="Quality"
                      type="monotone"
                      dataKey="quality"
                      stackId="1"
                      stroke="#f59e0b"
                      fill="#f59e0b20"
                      strokeWidth={2}
                    />
                    <Area
                      name="Dead Code"
                      type="monotone"
                      dataKey="deadCode"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f620"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Scans Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h2 className="font-semibold text-slate-900 text-sm">
                  Recent Scans
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Last {Math.min(scansTable.length, 20)} scans
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Branch</th>
                      <th className="px-4 py-3 text-left">Commit</th>
                      <th className="px-4 py-3 text-right">Security</th>
                      <th className="px-4 py-3 text-right">Quality</th>
                      <th className="px-4 py-3 text-right">Dead Code</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Gate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scansTable.map((scan) => (
                      <tr
                        key={scan.scanId}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-600">
                          <Link
                            href={`/dashboard/scans/${scan.scanId}`}
                            className="hover:text-slate-900 hover:underline"
                          >
                            {new Date(scan.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {scan.branch && (
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {scan.branch}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {scan.commitHash || "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {scan.security}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {scan.quality}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {scan.deadCode}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {scan.total}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {scan.gatePassed === null ? (
                            <span className="text-slate-300">-</span>
                          ) : scan.gatePassed ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                              PASS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                              FAIL
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
