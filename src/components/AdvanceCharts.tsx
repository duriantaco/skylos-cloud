'use client';

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ChartFinding = {
  file_path: string;
  rule_id?: string | null;
};

type ChartScan = {
  created_at: string;
  quality_gate_passed?: boolean | null;
  is_overridden?: boolean | null;
  stats?: {
    danger_count?: number | null;
    quality_count?: number | null;
    dead_code_count?: number | null;
    secret_count?: number | null;
    new_issues?: number | null;
    suppressed_new_issues?: number | null;
    legacy_issues?: number | null;
  } | null;
};

function value(n?: number | null) {
  return Number(n || 0);
}

function chartDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[340px] flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-5">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function ProjectIssueTrendChart({ scans }: { scans: ChartScan[] }) {
  const data = scans
    .slice()
    .reverse()
    .map((scan) => ({
      label: chartDate(scan.created_at),
      blocking: value(scan.stats?.new_issues),
      total:
        value(scan.stats?.danger_count) +
        value(scan.stats?.quality_count) +
        value(scan.stats?.dead_code_count) +
        value(scan.stats?.secret_count),
    }));

  return (
    <ChartCard
      title="Issue pressure over time"
      description="Track whether fresh blockers are staying contained while total finding volume trends down."
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            stroke="#94a3b8"
            fontSize={11}
            minTickGap={24}
          />
          <YAxis
            yAxisId="issues"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            stroke="#94a3b8"
            fontSize={11}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              backgroundColor: '#fff',
              borderColor: '#e2e8f0',
              color: '#0f172a',
              borderRadius: '16px',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
            }}
          />
          <Bar yAxisId="issues" dataKey="blocking" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={22} />
          <Area
            yAxisId="issues"
            type="monotone"
            dataKey="total"
            stroke="#2563eb"
            fill="#2563eb18"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ProjectCompositionChart({ scans }: { scans: ChartScan[] }) {
  const data = scans
    .slice()
    .reverse()
    .map((scan) => ({
      label: chartDate(scan.created_at),
      newIssues: value(scan.stats?.new_issues),
      suppressed: value(scan.stats?.suppressed_new_issues),
      carryover: value(scan.stats?.legacy_issues),
    }));

  return (
    <ChartCard
      title="What each scan is made of"
      description="See whether new findings are being suppressed, carried forward, or resolved before they pile up."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            stroke="#94a3b8"
            fontSize={11}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            stroke="#94a3b8"
            fontSize={11}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              backgroundColor: '#fff',
              borderColor: '#e2e8f0',
              color: '#0f172a',
              borderRadius: '16px',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
            }}
          />
          <Bar dataKey="newIssues" stackId="a" fill="#0f172a" radius={[6, 6, 0, 0]} />
          <Bar dataKey="suppressed" stackId="a" fill="#cbd5e1" />
          <Bar dataKey="carryover" stackId="a" fill="#60a5fa" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function FileHotspotChart({ findings }: { findings: ChartFinding[] }) {
  const fileCounts: Record<string, { label: string; value: number }> = {};

  findings.forEach((finding) => {
    const fullPath = finding.file_path || 'Unknown file';
    const parts = fullPath.split('/');
    const label = parts.length > 3 ? `.../${parts.slice(-3).join('/')}` : fullPath;
    if (!fileCounts[fullPath]) {
      fileCounts[fullPath] = { label, value: 0 };
    }
    fileCounts[fullPath].value += 1;
  });

  const data = Object.values(fileCounts)
    .map(({ label, value }) => ({ name: label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <ChartCard
      title="Latest scan hotspots"
      description="Which files are absorbing the most risk right now in the newest uploaded run."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
          <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={112}
            tick={{ fill: '#475569' }}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              backgroundColor: '#fff',
              borderColor: '#e2e8f0',
              color: '#0f172a',
              borderRadius: '16px',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
            }}
          />
          <Bar dataKey="value" barSize={18} radius={[0, 6, 6, 0]}>
            {data.map((_, index) => (
              <Cell key={`hotspot-${index}`} fill={index === 0 ? '#0f172a' : '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopViolationsChart({ findings }: { findings: ChartFinding[] }) {
  const ruleCounts: Record<string, number> = {};

  findings.forEach((finding) => {
    const label = finding.rule_id || 'Unknown';
    ruleCounts[label] = (ruleCounts[label] || 0) + 1;
  });

  const data = Object.entries(ruleCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <ChartCard
      title="Rule mix in the latest scan"
      description="The rule families that are dominating this upload, so you can tell if the noise is clustered."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
          <XAxis
            dataKey="name"
            stroke="#94a3b8"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fill: '#64748b' }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b' }}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              backgroundColor: '#fff',
              borderColor: '#e2e8f0',
              color: '#0f172a',
              borderRadius: '16px',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
            }}
          />
          <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
