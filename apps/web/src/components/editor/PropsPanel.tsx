'use client';

import { useGraphStore, type FlowNodeData } from '@/stores/useGraphStore';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Settings } from 'lucide-react';

const DISTRIBUTION_OPTIONS = [
  { value: 'fixed', label: 'Фиксированное' },
  { value: 'exponential', label: 'Экспоненциальное' },
  { value: 'normal', label: 'Нормальное' },
  { value: 'uniform', label: 'Равномерное' },
  { value: 'triangular', label: 'Треугольное' },
];

function DistributionFields({
  dist,
  onChange,
}: {
  dist: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}) {
  const type = (dist.type as string) || 'fixed';

  return (
    <div className="space-y-2">
      <Select
        label="Распределение"
        value={type}
        onChange={(val) => {
          const defaults: Record<string, Record<string, unknown>> = {
            fixed: { type: 'fixed', value: 1 },
            exponential: { type: 'exponential', mean: 5 },
            normal: { type: 'normal', mean: 5, stddev: 1 },
            uniform: { type: 'uniform', min: 1, max: 10 },
            triangular: { type: 'triangular', min: 1, mode: 5, max: 10 },
          };
          onChange(defaults[val] || defaults.fixed);
        }}
        options={DISTRIBUTION_OPTIONS}
      />
      {type === 'fixed' && (
        <Input
          label="Значение"
          type="number"
          value={String(dist.value ?? 1)}
          onChange={(e) => onChange({ ...dist, value: Number(e.target.value) })}
        />
      )}
      {type === 'exponential' && (
        <Input
          label="Среднее (mean)"
          type="number"
          value={String(dist.mean ?? 5)}
          onChange={(e) => onChange({ ...dist, mean: Number(e.target.value) })}
        />
      )}
      {type === 'normal' && (
        <>
          <Input
            label="Среднее (mean)"
            type="number"
            value={String(dist.mean ?? 5)}
            onChange={(e) => onChange({ ...dist, mean: Number(e.target.value) })}
          />
          <Input
            label="Std Dev"
            type="number"
            value={String(dist.stddev ?? 1)}
            onChange={(e) => onChange({ ...dist, stddev: Number(e.target.value) })}
          />
        </>
      )}
      {type === 'uniform' && (
        <>
          <Input
            label="Мин"
            type="number"
            value={String(dist.min ?? 1)}
            onChange={(e) => onChange({ ...dist, min: Number(e.target.value) })}
          />
          <Input
            label="Макс"
            type="number"
            value={String(dist.max ?? 10)}
            onChange={(e) => onChange({ ...dist, max: Number(e.target.value) })}
          />
        </>
      )}
      {type === 'triangular' && (
        <>
          <Input
            label="Мін"
            type="number"
            value={String(dist.min ?? 1)}
            onChange={(e) => onChange({ ...dist, min: Number(e.target.value) })}
          />
          <Input
            label="Мода"
            type="number"
            value={String(dist.mode ?? 5)}
            onChange={(e) => onChange({ ...dist, mode: Number(e.target.value) })}
          />
          <Input
            label="Макс"
            type="number"
            value={String(dist.max ?? 10)}
            onChange={(e) => onChange({ ...dist, max: Number(e.target.value) })}
          />
        </>
      )}
    </div>
  );
}

export function PropsPanel() {
  const { nodes, selectedNodeId, updateNodeData } = useGraphStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-72 border-l border-gray-200 bg-white p-4 flex flex-col items-center justify-center text-gray-400">
        <Settings className="w-8 h-8 mb-2" />
        <p className="text-sm">Выберите узел</p>
      </div>
    );
  }

  const data = selectedNode.data as FlowNodeData;
  const nodeType = data.nodeType;
  const params = data.params || {};

  function updateParams(newParams: Record<string, unknown>) {
    updateNodeData(selectedNode!.id, { params: newParams });
  }

  return (
    <div className="w-72 border-l border-gray-200 bg-white p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Свойства: {data.label}
      </h3>

      <div className="space-y-4">
        <Input
          label="Название"
          value={data.label || ''}
          onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
        />

        {nodeType === 'source' && (
          <>
            <p className="text-xs font-medium text-gray-500 mt-3">Время между прибытиями</p>
            <DistributionFields
              dist={(params.interArrivalTime as Record<string, unknown>) || { type: 'exponential', mean: 5 }}
              onChange={(d) => updateParams({ ...params, interArrivalTime: d })}
            />
          </>
        )}

        {nodeType === 'queue' && (
          <>
            <Input
              label="Вместимость (0 = бесконечно)"
              type="number"
              value={String(params.capacity ?? 0)}
              onChange={(e) => updateParams({ ...params, capacity: Number(e.target.value) })}
            />
            <Select
              label="Дисциплина"
              value={(params.discipline as string) || 'FIFO'}
              onChange={(val) => updateParams({ ...params, discipline: val })}
              options={[
                { value: 'FIFO', label: 'FIFO' },
                { value: 'LIFO', label: 'LIFO' },
                { value: 'PRIORITY', label: 'По приоритету' },
              ]}
            />
          </>
        )}

        {nodeType === 'process' && (
          <>
            <p className="text-xs font-medium text-gray-500 mt-3">Время обслуживания</p>
            <DistributionFields
              dist={(params.serviceTime as Record<string, unknown>) || { type: 'exponential', mean: 4 }}
              onChange={(d) => updateParams({ ...params, serviceTime: d })}
            />
            <Input
              label="Кол-во ресурсов"
              type="number"
              value={String(params.resourceCount ?? 1)}
              onChange={(e) => updateParams({ ...params, resourceCount: Math.max(1, Number(e.target.value)) })}
            />
          </>
        )}

        {nodeType === 'sink' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={params.collectStats !== false}
              onChange={(e) => updateParams({ ...params, collectStats: e.target.checked })}
              className="rounded"
            />
            Собирать статистику
          </label>
        )}
      </div>
    </div>
  );
}
