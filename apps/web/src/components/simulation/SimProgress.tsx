'use client';

import { useSimStore } from '@/stores/useSimStore';

export function SimProgress() {
  const { status, progress } = useSimStore();

  if (status !== 'running' && status !== 'pending') return null;

  const pct = Math.round(progress * 100);

  return (
    <div className="h-10 bg-blue-50 border-t border-blue-100 px-4 flex items-center gap-3">
      <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-blue-600 font-medium w-10 text-right">{pct}%</span>
    </div>
  );
}
