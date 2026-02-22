// ── Distribution types ──────────────────────────────────────────────

export interface FixedDistribution {
  type: 'fixed';
  value: number;
}

export interface ExponentialDistribution {
  type: 'exponential';
  mean: number;
}

export interface NormalDistribution {
  type: 'normal';
  mean: number;
  stddev: number;
}

export interface UniformDistribution {
  type: 'uniform';
  min: number;
  max: number;
}

export interface TriangularDistribution {
  type: 'triangular';
  min: number;
  mode: number;
  max: number;
}

export type Distribution =
  | FixedDistribution
  | ExponentialDistribution
  | NormalDistribution
  | UniformDistribution
  | TriangularDistribution;

// ── Node types ──────────────────────────────────────────────────────

export type NodeType = 'source' | 'queue' | 'process' | 'sink';

export interface SourceParams {
  interArrivalTime: Distribution;
}

export type QueueDiscipline = 'FIFO' | 'LIFO' | 'PRIORITY';

export interface QueueParams {
  capacity: number;
  discipline: QueueDiscipline;
}

export interface ProcessParams {
  serviceTime: Distribution;
  resourceCount: number;
  name: string;
}

export interface SinkParams {
  collectStats: boolean;
}

export interface SimNode {
  id: string;
  type: NodeType;
  label?: string;
  params: SourceParams | QueueParams | ProcessParams | SinkParams;
}

// ── Edge ────────────────────────────────────────────────────────────

export interface SimEdge {
  id: string;
  from: string;
  to: string;
}

// ── Config ──────────────────────────────────────────────────────────

export type TimeUnit = 'sec' | 'min' | 'hour';

export interface SimConfig {
  seed: number;
  duration: number;
  timeUnit: TimeUnit;
  warmupPeriod: number;
}

// ── Process Model ───────────────────────────────────────────────────

export interface ProcessModel {
  id: string;
  name: string;
  nodes: SimNode[];
  edges: SimEdge[];
  config: SimConfig;
}

// ── Events ──────────────────────────────────────────────────────────

export type EventType =
  | 'ENTITY_CREATED'
  | 'ENTITY_ENQUEUED'
  | 'SERVICE_START'
  | 'SERVICE_END'
  | 'ENTITY_DEPARTED';

export interface SimEvent {
  time: number;
  type: EventType;
  entityId: string;
  nodeId: string;
  priority: number;
}

// ── Entity ──────────────────────────────────────────────────────────

export interface Entity {
  id: string;
  createdAt: number;
  currentNodeId: string;
  priority: number;
}

// ── Results ─────────────────────────────────────────────────────────

export interface SimSummary {
  throughput: number;
  avgLeadTime: number;
  avgWIP: number;
  totalEntities: number;
  simulatedTime: number;
}

export interface NodeMetrics {
  utilization: number;
  avgQueueLength: number;
  avgWaitTime: number;
  avgServiceTime: number;
  processed: number;
}

export interface Bottleneck {
  nodeId: string;
  utilization: number;
  avgQueueLength: number;
}

export interface TimeSeries {
  timestamps: number[];
  wip: number[];
  throughputCumulative: number[];
}

export interface SimResult {
  summary: SimSummary;
  nodeMetrics: Record<string, NodeMetrics>;
  bottlenecks: Bottleneck[];
  timeSeries: TimeSeries;
}

// ── RNG interface ───────────────────────────────────────────────────

export interface RNG {
  next(): number;
  nextInt(min: number, max: number): number;
  reset(seed: number): void;
}
