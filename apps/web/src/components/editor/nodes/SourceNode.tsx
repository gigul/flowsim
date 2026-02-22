'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { PlayCircle } from 'lucide-react';
import type { FlowNodeData } from '@/stores/useGraphStore';

type SourceNodeProps = NodeProps & { data: FlowNodeData };

const SourceNode: React.FC<SourceNodeProps> = ({ data, selected }) => {
  const params = data.params as { interArrivalTime?: { type: string; mean?: number; value?: number } };
  const iat = params.interArrivalTime;

  let preview = '';
  if (iat) {
    if (iat.type === 'fixed') preview = `Fixed: ${iat.value}`;
    else if (iat.type === 'exponential') preview = `Exp(\u03bc=${iat.mean})`;
    else preview = iat.type;
  }

  return (
    <div
      className={`rounded-lg border-2 bg-blue-50 px-4 py-3 shadow-sm transition-shadow ${
        selected ? 'border-blue-600 shadow-md ring-2 ring-blue-300' : 'border-blue-400'
      }`}
      style={{ minWidth: 160 }}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
          <PlayCircle className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900">
            {data.label}
          </span>
          {preview && (
            <span className="text-xs text-gray-500">{preview}</span>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-blue-500 !bg-white"
      />
    </div>
  );
};

export default memo(SourceNode);
