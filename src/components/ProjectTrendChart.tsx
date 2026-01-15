'use client'

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GitBranch } from 'lucide-react';

export default function ProjectTrendChart({ scans }: { scans: any[] }) {
  const branches = Array.from(new Set(scans.map(s => s.branch))).sort();
  
  const defaultBranch = branches.find(b => b === 'main' || b === 'master') || branches[0] || '';
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);

  const chartData = useMemo(() => {
    return scans
      .filter(s => s.branch === selectedBranch)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(scan => ({
        date: new Date(scan.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' }),
        security: scan.stats?.danger_count || 0,
        quality: scan.stats?.quality_count || 0,
        commit: scan.commit_hash?.substring(0, 7),
        project: scan.projects?.name
      }));
  }, [scans, selectedBranch]);

  if (!scans || scans.length === 0) 
    return null;

  return (
    <div className="w-full h-[400px] bg-white border border-slate-200 rounded-xl p-6 flex flex-col shadow-sm">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <p className="text-xs text-slate-500 mt-1">
            Tracking issues over time for 
            <span className="ml-1 text-[10px] text-white font-mono bg-black px-1.5 py-0.5 rounded">
                {selectedBranch}
            </span>
        </p>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-300 transition">
            <GitBranch className="w-4 h-4 text-slate-500" />
            <select 
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer min-w-[100px]"
            >
                {branches.map(b => (
                    <option key={b} value={b} className="bg-white text-slate-900">{b}</option>
                ))}
            </select>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            
            <XAxis 
                dataKey="date" 
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
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#475569' }} iconType="circle" />
            
            <Line 
                name="Security Risks"
                type="monotone" 
                dataKey="security" 
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
                animationDuration={1000}
            />
            
            <Line 
                name="Quality Issues"
                type="monotone" 
                dataKey="quality" 
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
                animationDuration={1000}
            />
            </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xl text-xs z-50">
          <p className="text-slate-500 mb-2 font-medium">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-slate-600 capitalize">{p.name}:</span>
                <span className="font-bold text-slate-900">{p.value}</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-slate-100 text-slate-400 font-mono">
             Commit: <span className="text-slate-600">{payload[0].payload.commit}</span>
          </div>
        </div>
      );
    }
    return null;
};