'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AlignJustify } from 'lucide-react';
import { useGraphStore, type FlowNodeData } from '@/stores/useGraphStore';

type QueueNodeProps = NodeProps & { data: FlowNodeData; id: string };

const QueueNode: React.FC<QueueNodeProps> = ({ id, data, selected }) => {
  const isBottleneck = useGraphStore((s) => s.bottleneckNodeIds.has(id));
  const params = data.params as {
    capacity?: number;
    discipline?: string;
  };

  const capacityStr =
    params.capacity === Infinity || params.capacity === undefined
      ? '\u221e'
      : String(params.capacity);

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-shadow ${
        isBottleneck
          ? 'border-red-500 bg-red-50 ring-2 ring-red-300 shadow-md'
          : selected
            ? 'border-amber-600 bg-amber-50 shadow-md ring-2 ring-amber-300'
            : 'border-amber-400 bg-amber-50'
      }`}
      style={{ minWidth: 160 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-amber-500 !bg-white"
      />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500">
          <AlignJustify className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900">
            {data.label}
          </span>
          <span className="text-xs text-gray-500">
            Cap: {capacityStr} | {params.discipline ?? 'FIFO'}
          </span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-amber-500 !bg-white"
      />
    </div>
  );
};

export default memo(QueueNode);
