'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Cog } from 'lucide-react';
import { useGraphStore, type FlowNodeData } from '@/stores/useGraphStore';

type ProcessNodeProps = NodeProps & { data: FlowNodeData; id: string };

const ProcessNode: React.FC<ProcessNodeProps> = ({ id, data, selected }) => {
  const isBottleneck = useGraphStore((s) => s.bottleneckNodeIds.has(id));
  const params = data.params as {
    serviceTime?: { type: string; mean?: number; value?: number };
    resourceCount?: number;
  };

  const st = params.serviceTime;
  let stPreview = '';
  if (st) {
    if (st.type === 'fixed') stPreview = `Fixed: ${st.value}`;
    else if (st.type === 'exponential') stPreview = `Exp(\u03bc=${st.mean})`;
    else stPreview = st.type;
  }

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-shadow ${
        isBottleneck
          ? 'border-red-500 bg-red-50 ring-2 ring-red-300 shadow-md'
          : selected
            ? 'border-green-600 bg-green-50 shadow-md ring-2 ring-green-300'
            : 'border-green-400 bg-green-50'
      }`}
      style={{ minWidth: 160 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-green-500 !bg-white"
      />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500">
          <Cog className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900">
            {data.label}
          </span>
          <span className="text-xs text-gray-500">
            {stPreview}
            {params.resourceCount !== undefined &&
              ` | R:${params.resourceCount}`}
          </span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-green-500 !bg-white"
      />
    </div>
  );
};

export default memo(ProcessNode);
