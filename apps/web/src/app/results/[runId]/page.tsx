'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SummaryCards } from '@/components/results/SummaryCards';
import { UtilizationChart } from '@/components/results/UtilizationChart';
import { WipTimeline } from '@/components/results/WipTimeline';
import { MetricsTable } from '@/components/results/MetricsTable';
import { BottleneckList } from '@/components/results/BottleneckList';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import { Download } from 'lucide-react';

export default function ResultsPage() {
  const params = useParams();
  const runId = params.runId as string;
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [runId]);

  async function loadResults() {
    try {
      const data = await api.simulation.getResults(runId);
      setResult(data);
    } catch {
      console.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCsv() {
    const csv = await api.exportCsv(runId);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowsim-results-${runId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Загрузка результатов...</p>
        </div>
      </AppShell>
    );
  }

  if (!result) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Результаты не найдены</p>
        </div>
      </AppShell>
    );
  }

  const nodeMetricsArray = Object.entries(result.nodeMetrics || {}).map(([nodeId, m]: [string, any]) => ({
    nodeId,
    nodeName: m.name || nodeId,
    nodeType: m.type || 'process',
    utilization: m.utilization,
    avgQueueLength: m.avgQueueLength,
    avgWaitTime: m.avgWaitTime,
    avgServiceTime: m.avgServiceTime,
    processed: m.processed,
  }));

  const processNodes = nodeMetricsArray.filter((n) => n.utilization !== undefined && n.utilization > 0);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Результаты симуляции</h1>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-1" />
            Экспорт CSV
          </Button>
        </div>

        <SummaryCards
          throughput={result.summary.throughput}
          avgLeadTime={result.summary.avgLeadTime}
          avgWIP={result.summary.avgWIP}
          totalEntities={result.summary.totalEntities}
          timeUnit="мин"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UtilizationChart data={processNodes} />
          <WipTimeline
            timestamps={result.timeSeries?.timestamps || []}
            wip={result.timeSeries?.wip || []}
            timeUnit="мин"
          />
        </div>

        <MetricsTable data={nodeMetricsArray} />

        <BottleneckList bottlenecks={result.bottlenecks || []} />
      </div>
    </AppShell>
  );
}
