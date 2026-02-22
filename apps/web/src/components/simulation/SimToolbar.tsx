'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useSimStore } from '@/stores/useSimStore';
import { Play, RotateCcw } from 'lucide-react';

interface SimToolbarProps {
  scenarioId: string;
}

export function SimToolbar({ scenarioId }: SimToolbarProps) {
  const { status, startSimulation, reset } = useSimStore();
  const [seed, setSeed] = useState(42);
  const [duration, setDuration] = useState(480);
  const [timeUnit, setTimeUnit] = useState<'sec' | 'min' | 'hour'>('min');

  const isRunning = status === 'pending' || status === 'running';

  async function handleRun() {
    await startSimulation(scenarioId, { seed, duration, timeUnit, warmupPeriod: Math.floor(duration * 0.125) });
  }

  return (
    <div className="h-14 border-t border-gray-200 bg-white px-4 flex items-center gap-4">
      <Button onClick={handleRun} disabled={isRunning} size="sm">
        <Play className="w-4 h-4 mr-1" />
        {isRunning ? 'Выполняется...' : 'Запуск'}
      </Button>
      <Button variant="outline" size="sm" onClick={reset} disabled={isRunning}>
        <RotateCcw className="w-4 h-4 mr-1" />
        Сброс
      </Button>
      <div className="w-px h-6 bg-gray-200" />
      <Input
        label=""
        type="number"
        value={String(seed)}
        onChange={(e) => setSeed(Number(e.target.value))}
        className="w-24"
        placeholder="Seed"
      />
      <Input
        label=""
        type="number"
        value={String(duration)}
        onChange={(e) => setDuration(Number(e.target.value))}
        className="w-24"
        placeholder="Длительность"
      />
      <Select
        label=""
        value={timeUnit}
        onChange={(val) => setTimeUnit(val as 'sec' | 'min' | 'hour')}
        options={[
          { value: 'sec', label: 'сек' },
          { value: 'min', label: 'мин' },
          { value: 'hour', label: 'час' },
        ]}
      />
    </div>
  );
}
