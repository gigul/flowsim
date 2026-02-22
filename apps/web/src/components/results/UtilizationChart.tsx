'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface NodeMetric {
  nodeId: string;
  nodeName: string;
  utilization: number;
}

interface UtilizationChartProps {
  data: NodeMetric[];
}

function getColor(utilization: number): string {
  if (utilization > 0.85) return '#ef4444';
  if (utilization > 0.7) return '#f59e0b';
  return '#22c55e';
}

export function UtilizationChart({ data }: UtilizationChartProps) {
  const chartData = data.map((d) => ({
    name: d.nodeName,
    utilization: Math.round(d.utilization * 100),
    fill: getColor(d.utilization),
  }));

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Загрузка ресурсов (%)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => `${value}%`} />
          <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
