import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { initDatabase, closeDatabase } from '../src/db/migrate.js';
import projectRoutes from '../src/routes/projects.js';
import scenarioRoutes from '../src/routes/scenarios.js';
import simulateRoutes from '../src/routes/simulate.js';
import compareRoutes from '../src/routes/compare.js';
import { AppError } from '../src/lib/errors.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, 'test-simulate.db');

const COFFEE_MODEL = {
  id: 'test-model',
  name: 'Test Coffee',
  nodes: [
    { id: 'n1', label: 'Source', type: 'source', params: { interArrivalTime: { type: 'exponential', mean: 3 } } },
    { id: 'n2', label: 'Queue', type: 'queue', params: { capacity: 10, discipline: 'FIFO' } },
    { id: 'n3', label: 'Process', type: 'process', params: { serviceTime: { type: 'fixed', value: 2 }, resourceCount: 1, name: 'Barista' } },
    { id: 'n4', label: 'Sink', type: 'sink', params: { collectStats: true } },
  ],
  edges: [
    { id: 'e1', from: 'n1', to: 'n2' },
    { id: 'e2', from: 'n2', to: 'n3' },
    { id: 'e3', from: 'n3', to: 'n4' },
  ],
  config: { seed: 42, duration: 100, timeUnit: 'min', warmupPeriod: 0 },
};

describe('Simulate routes', () => {
  const app = Fastify();
  let projectId: string;
  let scenarioId: string;

  beforeAll(async () => {
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const p = TEST_DB + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    initDatabase(TEST_DB);

    app.setErrorHandler((error, _request, reply) => {
      if (error instanceof AppError) {
        reply.code(error.statusCode).send(error.toJSON());
      } else {
        reply.code(500).send({ error: { message: error.message } });
      }
    });

    await app.register(projectRoutes);
    await app.register(scenarioRoutes);
    await app.register(simulateRoutes);
    await app.register(compareRoutes);
    await app.ready();

    // Create project + scenario
    const pRes = await app.inject({ method: 'POST', url: '/api/projects', payload: { name: 'Sim Test' } });
    projectId = JSON.parse(pRes.body).id;

    const sRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/scenarios`,
      payload: { name: 'Coffee', modelJson: COFFEE_MODEL },
    });
    scenarioId = JSON.parse(sRes.body).id;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const p = TEST_DB + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  it('POST /api/scenarios/:id/simulate — runs simulation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/scenarios/${scenarioId}/simulate`,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('done');
    expect(body.runId).toBeDefined();
    expect(body.result.summary).toBeDefined();
    expect(body.result.summary.totalEntities).toBeGreaterThan(0);
    expect(body.result.summary.throughput).toBeGreaterThan(0);
    expect(body.result.nodeMetrics).toBeDefined();
    expect(body.result.timeSeries).toBeDefined();
  });

  it('GET /api/simulations/:runId/status — returns run status', async () => {
    const sim = await app.inject({
      method: 'POST',
      url: `/api/scenarios/${scenarioId}/simulate`,
      payload: {},
    });
    const { runId } = JSON.parse(sim.body);

    const res = await app.inject({ method: 'GET', url: `/api/simulations/${runId}/status` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.runId).toBe(runId);
    expect(body.status).toBe('done');
    expect(body.startedAt).toBeDefined();
    expect(body.finishedAt).toBeDefined();
  });

  it('GET /api/simulations/:runId/results — returns full results', async () => {
    const sim = await app.inject({
      method: 'POST',
      url: `/api/scenarios/${scenarioId}/simulate`,
      payload: {},
    });
    const { runId } = JSON.parse(sim.body);

    const res = await app.inject({ method: 'GET', url: `/api/simulations/${runId}/results` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.runId).toBe(runId);
    expect(body.config).toBeDefined();
    expect(body.result.summary).toBeDefined();
  });

  it('DELETE /api/simulations/:runId — cancels a run', async () => {
    const sim = await app.inject({
      method: 'POST',
      url: `/api/scenarios/${scenarioId}/simulate`,
      payload: {},
    });
    const { runId } = JSON.parse(sim.body);

    const res = await app.inject({ method: 'DELETE', url: `/api/simulations/${runId}` });
    expect(res.statusCode).toBe(204);
  });

  it('POST /api/compare — compares two scenarios', async () => {
    // Create second scenario
    const s2 = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/scenarios`,
      payload: { name: 'Coffee v2', modelJson: COFFEE_MODEL },
    });
    const scenarioId2 = JSON.parse(s2.body).id;

    // Simulate both
    await app.inject({ method: 'POST', url: `/api/scenarios/${scenarioId}/simulate`, payload: {} });
    await app.inject({ method: 'POST', url: `/api/scenarios/${scenarioId2}/simulate`, payload: {} });

    const res = await app.inject({
      method: 'POST',
      url: '/api/compare',
      payload: { scenarioIds: [scenarioId, scenarioId2] },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.comparisons).toHaveLength(2);
    expect(body.comparisons[0].result.summary).toBeDefined();
  });

  it('GET /api/simulations/:runId/status — 404 for non-existent', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/simulations/non-existent/status' });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/scenarios/:id/simulate — 404 for non-existent scenario', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/scenarios/non-existent/simulate',
      payload: {},
    });
    expect(res.statusCode).toBe(404);
  });
});
