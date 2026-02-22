'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WipTimelineProps {
  timestamps: number[];
  wip: number[];
  timeUnit: string;
}

export function WipTimeline({ timestamps, wip, timeUnit }: WipTimelineProps) {
  const data = timestamps.map((t, i) => ({
    time: Math.round(t),
    wip: wip[i],
  }));

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">WIP во времени</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} label={{ value: timeUnit, position: 'insideBottomRight', offset: -5 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={(v) => `${v} ${timeUnit}`} />
          <Line type="monotone" dataKey="wip" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
