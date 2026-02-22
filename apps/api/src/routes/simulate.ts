import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/migrate.js';
import { scenarios, simulationRuns } from '../db/schema.js';
import { NotFound, BadRequest, SimulationError } from '../lib/errors.js';
import { simulateRequestSchema, processModelSchema } from '@flowsim/shared';
import type { WorkerPool } from '../workers/pool.js';
import type { ProcessModel, SimConfig } from '@flowsim/sim-engine';
import { DEFAULT_SIM_CONFIG } from '@flowsim/shared';

declare module 'fastify' {
  interface FastifyInstance {
    workerPool: WorkerPool;
  }
}

const simulateRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /api/scenarios/:id/simulate ──────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/api/scenarios/:id/simulate',
    async (request, reply) => {
      const db = getDb();

      // Fetch scenario
      const [scenario] = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.id, request.params.id))
        .limit(1);

      if (!scenario) {
        throw NotFound('Scenario', request.params.id);
      }

      // Parse and validate the model
      const model = JSON.parse(scenario.modelJson) as ProcessModel;
      const modelValidation = processModelSchema.safeParse(model);
      if (!modelValidation.success) {
        throw BadRequest('Invalid model in scenario', modelValidation.error.flatten());
      }

      // Parse optional config overrides
      const parsed = simulateRequestSchema.safeParse(request.body || {});
      if (!parsed.success) {
        throw BadRequest('Invalid simulation config', parsed.error.flatten());
      }

      // Merge with model config and defaults
      const config: SimConfig = {
        ...DEFAULT_SIM_CONFIG,
        ...model.config,
        ...(parsed.data.config || {}),
      };

      // Create simulation run record
      const now = Math.floor(Date.now() / 1000);
      const runId = uuid();
      const run = {
        id: runId,
        scenarioId: request.params.id,
        status: 'pending',
        configJson: JSON.stringify(config),
        resultJson: null,
        startedAt: now,
        finishedAt: null,
        error: null,
      };

      await db.insert(simulationRuns).values(run);

      // Update status to running
      await db
        .update(simulationRuns)
        .set({ status: 'running' })
        .where(eq(simulationRuns.id, runId));

      // Dispatch to worker pool (non-blocking)
      fastify.workerPool
        .execute(model, config, (progress) => {
          fastify.log.debug({ runId, progress }, 'Simulation progress');
        })
        .then(async (result) => {
          const finishedAt = Math.floor(Date.now() / 1000);
          await db
            .update(simulationRuns)
            .set({
              status: 'completed',
              resultJson: JSON.stringify(result),
              finishedAt,
            })
            .where(eq(simulationRuns.id, runId));
          fastify.log.info({ runId }, 'Simulation completed');
        })
        .catch(async (err: Error) => {
          const finishedAt = Math.floor(Date.now() / 1000);
          await db
            .update(simulationRuns)
            .set({
              status: 'failed',
              error: err.message,
              finishedAt,
            })
            .where(eq(simulationRuns.id, runId));
          fastify.log.error({ runId, error: err.message }, 'Simulation failed');
        });

      reply.code(202);
      return { runId, status: 'running' };
    },
  );

  // ── GET /api/simulations/:runId/status ────────────────────────

  fastify.get<{ Params: { runId: string } }>(
    '/api/simulations/:runId/status',
    async (request) => {
      const db = getDb();

      const [run] = await db
        .select()
        .from(simulationRuns)
        .where(eq(simulationRuns.id, request.params.runId))
        .limit(1);

      if (!run) {
        throw NotFound('Simulation run', request.params.runId);
      }

      return {
        runId: run.id,
        scenarioId: run.scenarioId,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        error: run.error,
      };
    },
  );

  // ── GET /api/simulations/:runId/results ───────────────────────

  fastify.get<{ Params: { runId: string } }>(
    '/api/simulations/:runId/results',
    async (request) => {
      const db = getDb();

      const [run] = await db
        .select()
        .from(simulationRuns)
        .where(eq(simulationRuns.id, request.params.runId))
        .limit(1);

      if (!run) {
        throw NotFound('Simulation run', request.params.runId);
      }

      if (run.status !== 'completed' || !run.resultJson) {
        throw NotFound('Results not available yet (status: ' + run.status + ')');
      }

      return {
        runId: run.id,
        status: run.status,
        config: JSON.parse(run.configJson),
        result: JSON.parse(run.resultJson),
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
      };
    },
  );

  // ── DELETE /api/simulations/:runId ────────────────────────────

  fastify.delete<{ Params: { runId: string } }>(
    '/api/simulations/:runId',
    async (request, reply) => {
      const db = getDb();

      const [run] = await db
        .select()
        .from(simulationRuns)
        .where(eq(simulationRuns.id, request.params.runId))
        .limit(1);

      if (!run) {
        throw NotFound('Simulation run', request.params.runId);
      }

      // Cancel by setting error status
      if (run.status === 'pending' || run.status === 'running') {
        const now = Math.floor(Date.now() / 1000);
        await db
          .update(simulationRuns)
          .set({
            status: 'cancelled',
            error: 'Cancelled by user',
            finishedAt: now,
          })
          .where(eq(simulationRuns.id, request.params.runId));
      }

      reply.code(204);
      return null;
    },
  );
};

export default simulateRoutes;
