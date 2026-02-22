'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface ScenarioMetrics {
  scenarioId: string;
  name: string;
  metrics: {
    throughput: number;
    avgLeadTime: number;
    avgWIP: number;
    totalEntities: number;
  };
}

interface CompareViewProps {
  scenarios: ScenarioMetrics[];
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b'];

export function CompareView({ scenarios }: CompareViewProps) {
  if (scenarios.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">Запустите сравнение</p>;
  }

  const metricKeys = [
    { key: 'throughput', label: 'Пропускная способность' },
    { key: 'avgLeadTime', label: 'Ср. Lead Time' },
    { key: 'avgWIP', label: 'Ср. WIP' },
    { key: 'totalEntities', label: 'Всего сущностей' },
  ] as const;

  const chartData = metricKeys.map(({ key, label }) => {
    const row: Record<string, string | number> = { metric: label };
    scenarios.forEach((s, i) => {
      row[s.name] = Number(s.metrics[key].toFixed(2));
    });
    return row;
  });

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((s, i) => (
          <Card key={s.scenarioId} style={{ borderLeftColor: COLORS[i], borderLeftWidth: 4 }}>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-3">{s.name}</h4>
              <dl className="space-y-1 text-sm">
                {metricKeys.map(({ key, label }) => (
                  <div key={key} className="flex justify-between">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium">{s.metrics[key].toFixed(1)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grouped bar chart */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Сравнение метрик</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {scenarios.map((s, i) => (
              <Bar key={s.scenarioId} dataKey={s.name} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
