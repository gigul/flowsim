'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Bottleneck {
  nodeId: string;
  nodeName: string;
  utilization: number;
  avgQueueLength: number;
  reason: string;
}

interface BottleneckListProps {
  bottlenecks: Bottleneck[];
}

export function BottleneckList({ bottlenecks }: BottleneckListProps) {
  if (bottlenecks.length === 0) {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-green-700 text-sm">
        Узких мест не обнаружено
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Узкие места (Bottlenecks)</h3>
      {bottlenecks.map((b) => (
        <Card key={b.nodeId} className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">{b.nodeName}</p>
              <p className="text-sm text-red-600">
                Загрузка: {(b.utilization * 100).toFixed(1)}% | Ср. очередь: {b.avgQueueLength.toFixed(1)}
              </p>
              <p className="text-xs text-red-500 mt-1">{b.reason}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
