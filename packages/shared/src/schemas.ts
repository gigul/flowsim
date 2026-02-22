import { z } from 'zod';

// ── Distribution schemas ────────────────────────────────────────────

const fixedDistributionSchema = z.object({
  type: z.literal('fixed'),
  value: z.number().nonnegative(),
});

const exponentialDistributionSchema = z.object({
  type: z.literal('exponential'),
  mean: z.number().positive(),
});

const normalDistributionSchema = z.object({
  type: z.literal('normal'),
  mean: z.number().nonnegative(),
  stddev: z.number().positive(),
});

const uniformDistributionSchema = z.object({
  type: z.literal('uniform'),
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
}).refine((d) => d.max > d.min, {
  message: 'max must be greater than min',
});

const triangularDistributionSchema = z.object({
  type: z.literal('triangular'),
  min: z.number().nonnegative(),
  mode: z.number().nonnegative(),
  max: z.number().nonnegative(),
}).refine((d) => d.min <= d.mode && d.mode <= d.max, {
  message: 'must satisfy min <= mode <= max',
});

export const distributionSchema = z.discriminatedUnion('type', [
  fixedDistributionSchema,
  exponentialDistributionSchema,
  normalDistributionSchema,
  z.object({
    type: z.literal('uniform'),
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }),
  z.object({
    type: z.literal('triangular'),
    min: z.number().nonnegative(),
    mode: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }),
]);

// ── Node params schemas ─────────────────────────────────────────────

export const sourceParamsSchema = z.object({
  interArrivalTime: distributionSchema,
});

export const queueDisciplineSchema = z.enum(['FIFO', 'LIFO', 'PRIORITY']);

export const queueParamsSchema = z.object({
  capacity: z.number().positive(),
  discipline: queueDisciplineSchema,
});

export const processParamsSchema = z.object({
  serviceTime: distributionSchema,
  resourceCount: z.number().int().positive(),
  name: z.string().min(1),
});

export const sinkParamsSchema = z.object({
  collectStats: z.boolean(),
});

// ── SimNode schema (discriminated union on type) ────────────────────

const baseNodeFields = {
  id: z.string().min(1),
  label: z.string().optional(),
};

const sourceNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal('source'),
  params: sourceParamsSchema,
});

const queueNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal('queue'),
  params: queueParamsSchema,
});

const processNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal('process'),
  params: processParamsSchema,
});

const sinkNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal('sink'),
  params: sinkParamsSchema,
});

export const simNodeSchema = z.discriminatedUnion('type', [
  sourceNodeSchema,
  queueNodeSchema,
  processNodeSchema,
  sinkNodeSchema,
]);

// ── SimEdge schema ──────────────────────────────────────────────────

export const simEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
});

// ── SimConfig schema ────────────────────────────────────────────────

export const timeUnitSchema = z.enum(['sec', 'min', 'hour']);

export const simConfigSchema = z.object({
  seed: z.number().int(),
  duration: z.number().positive(),
  timeUnit: timeUnitSchema,
  warmupPeriod: z.number().nonnegative(),
});

// ── ProcessModel schema ─────────────────────────────────────────────

export const processModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.array(simNodeSchema),
  edges: z.array(simEdgeSchema),
  config: simConfigSchema,
});

// ── Result schemas ──────────────────────────────────────────────────

export const simSummarySchema = z.object({
  throughput: z.number(),
  avgLeadTime: z.number(),
  avgWIP: z.number(),
  totalEntities: z.number().int().nonnegative(),
  simulatedTime: z.number().nonnegative(),
});

export const nodeMetricsSchema = z.object({
  utilization: z.number().min(0).max(1),
  avgQueueLength: z.number().nonnegative(),
  avgWaitTime: z.number().nonnegative(),
  avgServiceTime: z.number().nonnegative(),
  processed: z.number().int().nonnegative(),
});

export const bottleneckSchema = z.object({
  nodeId: z.string(),
  utilization: z.number(),
  avgQueueLength: z.number(),
});

export const timeSeriesSchema = z.object({
  timestamps: z.array(z.number()),
  wip: z.array(z.number()),
  throughputCumulative: z.array(z.number()),
});

export const simResultSchema = z.object({
  summary: simSummarySchema,
  nodeMetrics: z.record(z.string(), nodeMetricsSchema),
  bottlenecks: z.array(bottleneckSchema),
  timeSeries: timeSeriesSchema,
});

// ── API request schemas ─────────────────────────────────────────────

export const createProjectRequestSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const createScenarioRequestSchema = z.object({
  name: z.string().min(1).max(100),
  modelJson: processModelSchema,
});

export const simulateRequestSchema = z.object({
  config: simConfigSchema.partial().optional(),
});

export const compareRequestSchema = z.object({
  scenarioIds: z.array(z.string().min(1)).min(2).max(5),
});
