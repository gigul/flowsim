'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Square } from 'lucide-react';
import type { FlowNodeData } from '@/stores/useGraphStore';

type SinkNodeProps = NodeProps & { data: FlowNodeData };

const SinkNode: React.FC<SinkNodeProps> = ({ data, selected }) => {
  return (
    <div
      className={`rounded-lg border-2 bg-gray-100 px-4 py-3 shadow-sm transition-shadow ${
        selected ? 'border-gray-600 shadow-md ring-2 ring-gray-300' : 'border-gray-400'
      }`}
      style={{ minWidth: 140 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-gray-500 !bg-white"
      />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-500">
          <Square className="h-5 w-5 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {data.label}
        </span>
      </div>
    </div>
  );
};

export default memo(SinkNode);
