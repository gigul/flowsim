'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Activity, Clock, Layers, Users } from 'lucide-react';

interface SummaryCardsProps {
  throughput: number;
  avgLeadTime: number;
  avgWIP: number;
  totalEntities: number;
  timeUnit: string;
}

export function SummaryCards({ throughput, avgLeadTime, avgWIP, totalEntities, timeUnit }: SummaryCardsProps) {
  const cards = [
    { label: 'Пропускная способность', value: `${throughput.toFixed(1)} / ${timeUnit}`, icon: Activity, color: 'text-blue-600 bg-blue-50' },
    { label: 'Среднее время выполнения', value: `${avgLeadTime.toFixed(1)} ${timeUnit}`, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Среднее WIP', value: avgWIP.toFixed(1), icon: Layers, color: 'text-green-600 bg-green-50' },
    { label: 'Всего сущностей', value: totalEntities.toString(), icon: Users, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-lg font-bold">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
