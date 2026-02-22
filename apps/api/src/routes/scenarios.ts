import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuid } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/migrate.js';
import { projects, scenarios, simulationRuns } from '../db/schema.js';
import { NotFound, BadRequest } from '../lib/errors.js';
import { createScenarioRequestSchema } from '@flowsim/shared';

const scenarioRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /api/projects/:id/scenarios ───────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/api/projects/:id/scenarios',
    async (request, reply) => {
      const db = getDb();

      // Verify project exists
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, request.params.id))
        .limit(1);

      if (!project) {
        throw NotFound('Project', request.params.id);
      }

      const parsed = createScenarioRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw BadRequest('Invalid request body', parsed.error.flatten());
      }

      const now = Math.floor(Date.now() / 1000);
      const scenario = {
        id: uuid(),
        projectId: request.params.id,
        name: parsed.data.name,
        modelJson: JSON.stringify(parsed.data.modelJson),
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(scenarios).values(scenario);

      reply.code(201);
      return {
        ...scenario,
        modelJson: parsed.data.modelJson,
      };
    },
  );

  // ── GET /api/projects/:id/scenarios ────────────────────────────

  fastify.get<{ Params: { id: string } }>(
    '/api/projects/:id/scenarios',
    async (request) => {
      const db = getDb();

      // Verify project exists
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, request.params.id))
        .limit(1);

      if (!project) {
        throw NotFound('Project', request.params.id);
      }

      const rows = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.projectId, request.params.id))
        .orderBy(scenarios.createdAt);

      return rows.map((row) => ({
        ...row,
        modelJson: JSON.parse(row.modelJson),
      }));
    },
  );

  // ── PUT /api/scenarios/:id ────────────────────────────────────

  fastify.put<{ Params: { id: string } }>(
    '/api/scenarios/:id',
    async (request) => {
      const db = getDb();

      const [existing] = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.id, request.params.id))
        .limit(1);

      if (!existing) {
        throw NotFound('Scenario', request.params.id);
      }

      const body = request.body as Record<string, unknown>;
      const now = Math.floor(Date.now() / 1000);
      const updates: Record<string, unknown> = { updatedAt: now };

      if (body.name && typeof body.name === 'string') {
        updates.name = body.name;
      }

      if (body.modelJson) {
        // Validate the model JSON using the schema
        const { processModelSchema } = await import('@flowsim/shared');
        const parsed = processModelSchema.safeParse(body.modelJson);
        if (!parsed.success) {
          throw BadRequest('Invalid model JSON', parsed.error.flatten());
        }
        updates.modelJson = JSON.stringify(parsed.data);
      }

      await db
        .update(scenarios)
        .set(updates)
        .where(eq(scenarios.id, request.params.id));

      const [updated] = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.id, request.params.id))
        .limit(1);

      return {
        ...updated,
        modelJson: JSON.parse(updated.modelJson),
      };
    },
  );

  // ── DELETE /api/scenarios/:id ─────────────────────────────────

  fastify.delete<{ Params: { id: string } }>(
    '/api/scenarios/:id',
    async (request, reply) => {
      const db = getDb();

      const [existing] = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.id, request.params.id))
        .limit(1);

      if (!existing) {
        throw NotFound('Scenario', request.params.id);
      }

      // Delete associated simulation runs first
      await db
        .delete(simulationRuns)
        .where(eq(simulationRuns.scenarioId, request.params.id));

      await db.delete(scenarios).where(eq(scenarios.id, request.params.id));

      reply.code(204);
      return null;
    },
  );
};

export default scenarioRoutes;
