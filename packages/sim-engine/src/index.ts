// ── Public API ───────────────────────────────────────────────────────

export { SimEngine } from './engine.js';
export { validateModel } from './validator.js';
export type { ValidationResult } from './validator.js';
export { detectBottlenecks } from './bottleneck.js';
export { createRng } from './rng.js';
export { sampleDistribution } from './distributions.js';
export { EventQueue } from './event-queue.js';
export { ResourcePool } from './resource-pool.js';

// Re-export all types
export type {
  Distribution,
  FixedDistribution,
  ExponentialDistribution,
  NormalDistribution,
  UniformDistribution,
  TriangularDistribution,
  NodeType,
  SimNode,
  SourceParams,
  QueueDiscipline,
  QueueParams,
  ProcessParams,
  SinkParams,
  SimEdge,
  TimeUnit,
  SimConfig,
  ProcessModel,
  EventType,
  SimEvent,
  Entity,
  SimSummary,
  NodeMetrics,
  Bottleneck,
  TimeSeries,
  SimResult,
  RNG,
} from './types.js';
