'use client';

import { useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import { Undo2, Redo2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { NodePalette } from '@/components/editor/NodePalette';
import { GraphCanvas } from '@/components/editor/GraphCanvas';
import { PropsPanel } from '@/components/editor/PropsPanel';
import { SimToolbar } from '@/components/simulation/SimToolbar';
import { SimProgress } from '@/components/simulation/SimProgress';
import { useProjectStore } from '@/stores/useProjectStore';
import { useGraphStore } from '@/stores/useGraphStore';
import { useSimStore } from '@/stores/useSimStore';

export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;
  const scenarioId = searchParams.get('scenario') || '';

  const { fetchScenarios, scenarios, currentScenarioId, setCurrentScenario } = useProjectStore();
  const { loadFromModel, undo, redo, canUndo, canRedo, setBottleneckNodes } = useGraphStore();
  const { status, result } = useSimStore();

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  useEffect(() => {
    fetchScenarios(projectId);
  }, [projectId, fetchScenarios]);

  useEffect(() => {
    if (scenarioId) {
      setCurrentScenario(scenarioId);
    } else if (scenarios.length > 0 && !currentScenarioId) {
      setCurrentScenario(scenarios[0].id);
    }
  }, [scenarioId, scenarios, currentScenarioId, setCurrentScenario]);

  useEffect(() => {
    const scenario = scenarios.find((s) => s.id === currentScenarioId);
    if (scenario?.modelJson) {
      loadFromModel(scenario.modelJson);
    }
  }, [currentScenarioId, scenarios, loadFromModel]);

  useEffect(() => {
    if (status === 'done' && result) {
      // Highlight bottleneck nodes on the canvas
      const bottleneckIds = result.bottlenecks?.map((b: { nodeId: string }) => b.nodeId) ?? [];
      setBottleneckNodes(bottleneckIds);
    } else if (status === 'idle') {
      setBottleneckNodes([]);
    }
  }, [status, result, setBottleneckNodes]);

  const activeScenarioId = currentScenarioId || scenarioId;

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Scenario tabs + undo/redo */}
        <div className="h-10 bg-white border-b flex items-center px-4 gap-2">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setCurrentScenario(s.id)}
              className={`px-3 py-1 text-sm rounded ${
                s.id === activeScenarioId
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {s.name}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo()}
              title="Отменить (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo()}
              title="Повторить (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex flex-1 overflow-hidden">
          <ReactFlowProvider>
            <NodePalette />
            <GraphCanvas />
            <PropsPanel />
          </ReactFlowProvider>
        </div>

        {/* Simulation */}
        <SimProgress />
        {activeScenarioId && <SimToolbar scenarioId={activeScenarioId} />}

        {/* Quick link to results */}
        {status === 'done' && (
          <div className="h-10 bg-green-50 border-t border-green-200 px-4 flex items-center justify-between">
            <span className="text-sm text-green-700">Симуляция завершена</span>
            <button
              onClick={() => router.push(`/results/${useSimStore.getState().runId}`)}
              className="text-sm text-green-700 underline hover:text-green-900"
            >
              Посмотреть результаты
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
