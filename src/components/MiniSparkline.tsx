"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";

type Props = {
  data: number[];
  color?: string;
};

export default function MiniSparkline({ data, color = "#94a3b8" }: Props) {
  if (data.length < 2) 
    return null;

  const chartData = data.map((v, i) => ({ v, i }));

  return (
    <div className="h-8 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            fill={`${color}20`}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
