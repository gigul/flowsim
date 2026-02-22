import type { FastifyPluginAsync } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/migrate.js';
import { scenarios, simulationRuns } from '../db/schema.js';
import { NotFound, BadRequest } from '../lib/errors.js';
import { compareRequestSchema } from '@flowsim/shared';

const compareRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /api/compare ─────────────────────────────────────────

  fastify.post('/api/compare', async (request) => {
    const parsed = compareRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw BadRequest('Invalid request body', parsed.error.flatten());
    }

    const db = getDb();
    const results: Array<{
      scenarioId: string;
      scenarioName: string;
      runId: string;
      result: unknown;
      config: unknown;
      completedAt: number | null;
    }> = [];

    for (const scenarioId of parsed.data.scenarioIds) {
      // Verify scenario exists
      const [scenario] = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.id, scenarioId))
        .limit(1);

      if (!scenario) {
        throw NotFound('Scenario', scenarioId);
      }

      // Get the latest completed simulation run
      const [latestRun] = await db
        .select()
        .from(simulationRuns)
        .where(eq(simulationRuns.scenarioId, scenarioId))
        .orderBy(desc(simulationRuns.startedAt))
        .limit(1);

      if (!latestRun || latestRun.status !== 'completed' || !latestRun.resultJson) {
        throw BadRequest(
          `No completed simulation results for scenario '${scenario.name}' (${scenarioId})`,
        );
      }

      results.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        runId: latestRun.id,
        result: JSON.parse(latestRun.resultJson),
        config: JSON.parse(latestRun.configJson),
        completedAt: latestRun.finishedAt,
      });
    }

    return { comparisons: results };
  });
};

export default compareRoutes;
