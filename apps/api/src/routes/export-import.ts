import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/migrate.js';
import { projects, scenarios, simulationRuns } from '../db/schema.js';
import { NotFound, BadRequest } from '../lib/errors.js';
import { generateCsv } from '../lib/csv.js';
import { processModelSchema } from '@flowsim/shared';
import type { SimResult } from '@flowsim/sim-engine';

const exportImportRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /api/simulations/:runId/export/csv ────────────────────

  fastify.get<{ Params: { runId: string } }>(
    '/api/simulations/:runId/export/csv',
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

      if (run.status !== 'done' || !run.resultJson) {
        throw BadRequest('Results not available (status: ' + run.status + ')');
      }

      const result = JSON.parse(run.resultJson) as SimResult;
      const csv = generateCsv(result);

      reply.header('Content-Type', 'text/csv');
      reply.header(
        'Content-Disposition',
        `attachment; filename="simulation-${run.id}.csv"`,
      );
      return csv;
    },
  );

  // ── GET /api/projects/:id/export/json ─────────────────────────

  fastify.get<{ Params: { id: string } }>(
    '/api/projects/:id/export/json',
    async (request, reply) => {
      const db = getDb();

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, request.params.id))
        .limit(1);

      if (!project) {
        throw NotFound('Project', request.params.id);
      }

      const projectScenarios = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.projectId, request.params.id));

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        project: {
          name: project.name,
          createdAt: project.createdAt,
        },
        scenarios: projectScenarios.map((s) => ({
          name: s.name,
          model: JSON.parse(s.modelJson),
        })),
      };

      reply.header('Content-Type', 'application/json');
      reply.header(
        'Content-Disposition',
        `attachment; filename="project-${project.id}.json"`,
      );
      return exportData;
    },
  );

  // ── POST /api/projects/import/json ────────────────────────────

  fastify.post('/api/projects/import/json', async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    if (!body || typeof body !== 'object') {
      throw BadRequest('Request body must be a JSON object');
    }

    const projectData = body.project as Record<string, unknown> | undefined;
    const scenariosData = body.scenarios as Array<Record<string, unknown>> | undefined;

    if (!projectData || !projectData.name) {
      throw BadRequest('Missing project.name in import data');
    }

    const now = Math.floor(Date.now() / 1000);
    const projectId = uuid();

    const db = getDb();

    // Create the project
    await db.insert(projects).values({
      id: projectId,
      name: String(projectData.name),
      createdAt: now,
      updatedAt: now,
    });

    // Import scenarios if provided
    const importedScenarios: Array<{ id: string; name: string }> = [];

    if (Array.isArray(scenariosData)) {
      for (const scenarioData of scenariosData) {
        if (!scenarioData.name || !scenarioData.model) continue;

        // Validate model
        const modelValidation = processModelSchema.safeParse(scenarioData.model);
        if (!modelValidation.success) {
          fastify.log.warn(
            { scenario: scenarioData.name, errors: modelValidation.error.flatten() },
            'Skipping invalid scenario during import',
          );
          continue;
        }

        const scenarioId = uuid();
        await db.insert(scenarios).values({
          id: scenarioId,
          projectId,
          name: String(scenarioData.name),
          modelJson: JSON.stringify(modelValidation.data),
          createdAt: now,
          updatedAt: now,
        });

        importedScenarios.push({ id: scenarioId, name: String(scenarioData.name) });
      }
    }

    reply.code(201);
    return {
      projectId,
      name: String(projectData.name),
      scenariosImported: importedScenarios.length,
      scenarios: importedScenarios,
    };
  });
};

export default exportImportRoutes;
