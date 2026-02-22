import {
  DEFAULT_SOURCE_PARAMS,
  DEFAULT_QUEUE_PARAMS,
  DEFAULT_PROCESS_PARAMS,
  DEFAULT_SINK_PARAMS,
  DEFAULT_SIM_CONFIG,
} from '@flowsim/shared';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type NodeTypeKey = 'source' | 'queue' | 'process' | 'sink';

export interface NodeTypeConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string; // lucide icon name
}

export const NODE_TYPE_CONFIGS: Record<NodeTypeKey, NodeTypeConfig> = {
  source: {
    label: 'Source',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    borderColor: '#3b82f6',
    icon: 'PlayCircle',
  },
  queue: {
    label: 'Queue',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b',
    icon: 'AlignJustify',
  },
  process: {
    label: 'Process',
    color: '#22c55e',
    bgColor: '#dcfce7',
    borderColor: '#22c55e',
    icon: 'Cog',
  },
  sink: {
    label: 'Sink',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    borderColor: '#6b7280',
    icon: 'Square',
  },
};

export const DEFAULT_PARAMS: Record<NodeTypeKey, unknown> = {
  source: DEFAULT_SOURCE_PARAMS,
  queue: DEFAULT_QUEUE_PARAMS,
  process: DEFAULT_PROCESS_PARAMS,
  sink: DEFAULT_SINK_PARAMS,
};

export { DEFAULT_SIM_CONFIG };
