'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrendChart({ data }: { data: any[] }) {
  const chartData = [...data].reverse().map(s => ({
    date: new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    issues: s.stats?.danger_count || 0
  }));

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
            itemStyle={{ color: '#ef4444' }}
          />
          <Area type="monotone" dataKey="issues" stroke="#ef4444" fillOpacity={1} fill="url(#colorIssues)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}