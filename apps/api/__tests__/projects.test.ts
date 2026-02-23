import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { initDatabase, closeDatabase } from '../src/db/migrate.js';
import projectRoutes from '../src/routes/projects.js';
import { AppError } from '../src/lib/errors.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, 'test-projects.db');

describe('Project routes', () => {
  const app = Fastify();

  beforeAll(async () => {
    // Clean up any previous test DB
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const p = TEST_DB + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    initDatabase(TEST_DB);

    // Error handler for AppError
    app.setErrorHandler((error, _request, reply) => {
      if (error instanceof AppError) {
        reply.code(error.statusCode).send(error.toJSON());
      } else {
        reply.code(500).send({ error: { message: error.message } });
      }
    });

    // Routes already define /api/ prefix in their paths
    await app.register(projectRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const p = TEST_DB + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  it('POST /api/projects — creates a project', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Test Project' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Test Project');
  });

  it('GET /api/projects — lists projects', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/projects/:id — returns a project', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Get Test' },
    });
    const { id } = JSON.parse(create.body);

    const res = await app.inject({ method: 'GET', url: `/api/projects/${id}` });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).name).toBe('Get Test');
  });

  it('PUT /api/projects/:id — updates a project', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Before Update' },
    });
    const { id } = JSON.parse(create.body);

    const res = await app.inject({
      method: 'PUT',
      url: `/api/projects/${id}`,
      payload: { name: 'After Update' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).name).toBe('After Update');
  });

  it('DELETE /api/projects/:id — deletes a project', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'To Delete' },
    });
    const { id } = JSON.parse(create.body);

    const res = await app.inject({ method: 'DELETE', url: `/api/projects/${id}` });
    expect(res.statusCode).toBe(204);

    const get = await app.inject({ method: 'GET', url: `/api/projects/${id}` });
    expect(get.statusCode).toBe(404);
  });

  it('GET /api/projects/:id — 404 for non-existent', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/projects/non-existent-id',
    });
    expect(res.statusCode).toBe(404);
  });
});
