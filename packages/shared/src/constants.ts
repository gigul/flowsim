// ── Node types ──────────────────────────────────────────────────────

export const NODE_TYPES = ['source', 'queue', 'process', 'sink'] as const;

// ── Distribution types ──────────────────────────────────────────────

export const DISTRIBUTION_TYPES = [
  'fixed',
  'exponential',
  'normal',
  'uniform',
  'triangular',
] as const;

// ── Default simulation config ───────────────────────────────────────

export const DEFAULT_SIM_CONFIG = {
  seed: 42,
  duration: 480,
  timeUnit: 'min' as const,
  warmupPeriod: 60,
} satisfies {
  seed: number;
  duration: number;
  timeUnit: 'sec' | 'min' | 'hour';
  warmupPeriod: number;
};

// ── Default node params ─────────────────────────────────────────────

export const DEFAULT_SOURCE_PARAMS = {
  interArrivalTime: { type: 'exponential' as const, mean: 5 },
};

export const DEFAULT_QUEUE_PARAMS = {
  capacity: Infinity,
  discipline: 'FIFO' as const,
};

export const DEFAULT_PROCESS_PARAMS = {
  serviceTime: { type: 'exponential' as const, mean: 4 },
  resourceCount: 1,
  name: 'Process',
};

export const DEFAULT_SINK_PARAMS = {
  collectStats: true,
};

// ── Limits ──────────────────────────────────────────────────────────

/** Maximum number of nodes allowed in a process model. */
export const MAX_NODES = 50;

/** Maximum simulation duration in seconds (24 hours). */
export const MAX_SIMULATION_DURATION = 86_400;

// ── Bottleneck detection thresholds ─────────────────────────────────

/** Utilization above this value flags a node as a bottleneck. */
export const BOTTLENECK_UTILIZATION_THRESHOLD = 0.85;

/** Average queue length above this value flags a node as a bottleneck. */
export const BOTTLENECK_QUEUE_THRESHOLD = 1;
