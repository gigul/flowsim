import type { z } from 'zod';
import type {
  distributionSchema,
  sourceParamsSchema,
  queueParamsSchema,
  processParamsSchema,
  sinkParamsSchema,
  simNodeSchema,
  simEdgeSchema,
  simConfigSchema,
  processModelSchema,
  simResultSchema,
  simSummarySchema,
  nodeMetricsSchema,
  bottleneckSchema,
  timeSeriesSchema,
  createProjectRequestSchema,
  updateProjectRequestSchema,
  createScenarioRequestSchema,
  simulateRequestSchema,
  compareRequestSchema,
} from './schemas.js';

// ── Inferred types from Zod schemas ─────────────────────────────────

export type Distribution = z.infer<typeof distributionSchema>;
export type SourceParams = z.infer<typeof sourceParamsSchema>;
export type QueueParams = z.infer<typeof queueParamsSchema>;
export type ProcessParams = z.infer<typeof processParamsSchema>;
export type SinkParams = z.infer<typeof sinkParamsSchema>;
export type SimNode = z.infer<typeof simNodeSchema>;
export type SimEdge = z.infer<typeof simEdgeSchema>;
export type SimConfig = z.infer<typeof simConfigSchema>;
export type ProcessModel = z.infer<typeof processModelSchema>;
export type SimResult = z.infer<typeof simResultSchema>;
export type SimSummary = z.infer<typeof simSummarySchema>;
export type NodeMetrics = z.infer<typeof nodeMetricsSchema>;
export type Bottleneck = z.infer<typeof bottleneckSchema>;
export type TimeSeries = z.infer<typeof timeSeriesSchema>;

// ── API request types ───────────────────────────────────────────────

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export type CreateScenarioRequest = z.infer<typeof createScenarioRequestSchema>;
export type SimulateRequest = z.infer<typeof simulateRequestSchema>;
export type CompareRequest = z.infer<typeof compareRequestSchema>;

// ── Domain entities ─────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type SimulationStatus = 'pending' | 'running' | 'done' | 'error';

export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  modelJson: ProcessModel;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationRun {
  id: string;
  scenarioId: string;
  status: SimulationStatus;
  config: SimConfig;
  result?: SimResult;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

// ── API response types ──────────────────────────────────────────────

export interface CompareResult {
  scenarios: Array<{
    scenarioId: string;
    name: string;
    metrics: SimSummary;
  }>;
}

export interface Template {
  slug: string;
  name: string;
  description: string;
  model: ProcessModel;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// ── Generic API response wrapper ────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
}
