'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ScenarioPicker } from '@/components/compare/ScenarioPicker';
import { CompareView } from '@/components/compare/CompareView';
import { Button } from '@/components/ui/button';
import { useCompareStore } from '@/stores/useCompareStore';
import { api } from '@/api/client';
import { GitCompare } from 'lucide-react';

function CompareContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') || '';
  const [scenarios, setScenarios] = useState<Array<{ id: string; name: string }>>([]);
  const { selectedScenarioIds, compareResult, runComparison } = useCompareStore();

  useEffect(() => {
    if (projectId) {
      api.scenarios.list(projectId).then(setScenarios).catch(console.error);
    }
  }, [projectId]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Сравнение сценариев</h1>
        <Button
          onClick={() => runComparison(projectId)}
          disabled={selectedScenarioIds.length < 2}
        >
          <GitCompare className="w-4 h-4 mr-2" />
          Сравнить
        </Button>
      </div>

      <ScenarioPicker scenarios={scenarios} />

      {compareResult && <CompareView scenarios={compareResult.scenarios} />}
    </div>
  );
}

export default function ComparePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-6 text-gray-500">Загрузка...</div>}>
        <CompareContent />
      </Suspense>
    </AppShell>
  );
}
