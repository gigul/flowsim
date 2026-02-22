'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AlignJustify } from 'lucide-react';
import type { FlowNodeData } from '@/stores/useGraphStore';

type QueueNodeProps = NodeProps & { data: FlowNodeData };

const QueueNode: React.FC<QueueNodeProps> = ({ data, selected }) => {
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
      className={`rounded-lg border-2 bg-amber-50 px-4 py-3 shadow-sm transition-shadow ${
        selected ? 'border-amber-600 shadow-md ring-2 ring-amber-300' : 'border-amber-400'
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
