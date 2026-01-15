'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function FileHotspotChart({ findings }: { findings: any[] }) {
  const fileCounts: Record<string, number> = {};
  
  findings.forEach(f => {
    const name = f.file_path.split('/').pop() || f.file_path;
    fileCounts[name] = (fileCounts[name] || 0) + 1;
  });

  const data = Object.entries(fileCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="w-full h-[320px] bg-white border border-slate-200 rounded-xl p-5 flex flex-col shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Toxic Files (Top 5)</h3>
        <p className="text-xs text-slate-500 mt-1">Refactoring these files yields the highest ROI.</p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                width={100}
                tick={{fill: '#475569'}}
            />
            <Tooltip 
              cursor={{fill: '#f1f5f9'}}
              contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: '#334155' }}
            />
            <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#ef4444" : "#f59e0b"} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TopViolationsChart({ findings }: { findings: any[] }) {
  const ruleCounts: Record<string, number> = {};
  
  findings.forEach(f => {
    const label = f.rule_id || "Unknown";
    ruleCounts[label] = (ruleCounts[label] || 0) + 1;
  });

  const data = Object.entries(ruleCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="w-full h-[320px] bg-white border border-slate-200 rounded-xl p-5 flex flex-col shadow-sm">
       <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Top Violations</h3>
        <p className="text-xs text-slate-500 mt-1">The most frequent coding errors across the team.</p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                interval={0}
                tick={{fill: '#64748b'}} 
            />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
            <Tooltip 
              cursor={{fill: '#f1f5f9'}}
              contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: '#334155' }}
            />
            <Bar dataKey="value" fill="#212122" radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}