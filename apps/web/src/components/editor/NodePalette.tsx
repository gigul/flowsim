'use client';

import { DragEvent } from 'react';
import { PlayCircle, AlignJustify, Cog, Square } from 'lucide-react';

const NODE_TYPES = [
  { type: 'source', label: 'Source', icon: PlayCircle, color: 'bg-blue-100 border-blue-400 text-blue-700' },
  { type: 'queue', label: 'Queue', icon: AlignJustify, color: 'bg-amber-100 border-amber-400 text-amber-700' },
  { type: 'process', label: 'Process', icon: Cog, color: 'bg-green-100 border-green-400 text-green-700' },
  { type: 'sink', label: 'Sink', icon: Square, color: 'bg-gray-100 border-gray-400 text-gray-700' },
] as const;

export function NodePalette() {
  function onDragStart(e: DragEvent, nodeType: string) {
    e.dataTransfer.setData('application/reactflow-type', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div className="w-48 border-r border-gray-200 bg-white p-4 flex flex-col gap-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Узлы</h3>
      {NODE_TYPES.map(({ type, label, icon: Icon, color }) => (
        <div
          key={type}
          draggable
          onDragStart={(e) => onDragStart(e, type)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-grab active:cursor-grabbing ${color} hover:shadow-sm transition-shadow`}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}
