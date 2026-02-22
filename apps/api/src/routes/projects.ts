import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/migrate.js';
import { projects, scenarios, simulationRuns } from '../db/schema.js';
import { NotFound, BadRequest } from '../lib/errors.js';
import {
  createProjectRequestSchema,
  updateProjectRequestSchema,
} from '@flowsim/shared';

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /api/projects ─────────────────────────────────────────

  fastify.post('/api/projects', async (request, reply) => {
    const parsed = createProjectRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw BadRequest('Invalid request body', parsed.error.flatten());
    }

    const now = Math.floor(Date.now() / 1000);
    const project = {
      id: uuid(),
      name: parsed.data.name,
      createdAt: now,
      updatedAt: now,
    };

    const db = getDb();
    await db.insert(projects).values(project);

    reply.code(201);
    return project;
  });

  // ── GET /api/projects ──────────────────────────────────────────

  fastify.get('/api/projects', async () => {
    const db = getDb();
    const rows = await db.select().from(projects).orderBy(projects.createdAt);
    return rows;
  });

  // ── GET /api/projects/:id ──────────────────────────────────────

  fastify.get<{ Params: { id: string } }>(
    '/api/projects/:id',
    async (request) => {
      const db = getDb();
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, request.params.id))
        .limit(1);

      if (!project) {
        throw NotFound('Project', request.params.id);
      }

      return project;
    },
  );

  // ── PUT /api/projects/:id ─────────────────────────────────────

  fastify.put<{ Params: { id: string } }>(
    '/api/projects/:id',
    async (request) => {
      const parsed = updateProjectRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw BadRequest('Invalid request body', parsed.error.flatten());
      }

      const db = getDb();
      const [existing] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, request.params.id))
        .limit(1);

      if (!existing) {
        throw NotFound('Project', request.params.id);
      }

      const now = Math.floor(Date.now() / 1000);
      const updates: Record<string, unknown> = { updatedAt: now };
      if (parsed.data.name !== undefined) {
        updates.name = parsed.data.name;
      }

      await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, request.params.id));

      const [updated] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, request.params.id))
        .limit(1);

      return updated;
    },
  );

  // ── DELETE /api/projects/:id ──────────────────────────────────

  fastify.delete<{ Params: { id: string } }>(
    '/api/projects/:id',
    async (request, reply) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, request.params.id))
        .limit(1);

      if (!existing) {
        throw NotFound('Project', request.params.id);
      }

      // Cascading delete: simulation_runs -> scenarios -> project
      // SQLite foreign key CASCADE handles scenarios, but we also need
      // to delete simulation_runs for scenarios in this project.
      const projectScenarios = await db
        .select({ id: scenarios.id })
        .from(scenarios)
        .where(eq(scenarios.projectId, request.params.id));

      for (const s of projectScenarios) {
        await db
          .delete(simulationRuns)
          .where(eq(simulationRuns.scenarioId, s.id));
      }

      await db
        .delete(scenarios)
        .where(eq(scenarios.projectId, request.params.id));

      await db.delete(projects).where(eq(projects.id, request.params.id));

      reply.code(204);
      return null;
    },
  );
};

export default projectRoutes;
