'use client';

import { useCompareStore } from '@/stores/useCompareStore';

interface Scenario {
  id: string;
  name: string;
}

interface ScenarioPickerProps {
  scenarios: Scenario[];
}

export function ScenarioPicker({ scenarios }: ScenarioPickerProps) {
  const { selectedScenarioIds, toggleScenario } = useCompareStore();

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Выберите сценарии для сравнения (2–3)</h3>
      <div className="space-y-2">
        {scenarios.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selectedScenarioIds.includes(s.id)}
              onChange={() => toggleScenario(s.id)}
              disabled={!selectedScenarioIds.includes(s.id) && selectedScenarioIds.length >= 3}
              className="rounded"
            />
            {s.name}
          </label>
        ))}
      </div>
      {selectedScenarioIds.length < 2 && (
        <p className="text-xs text-amber-600 mt-2">Выберите минимум 2 сценария</p>
      )}
    </div>
  );
}
