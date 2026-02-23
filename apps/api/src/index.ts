import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { initDatabase } from './db/migrate.js';
import { AppError } from './lib/errors.js';
import projectRoutes from './routes/projects.js';
import scenarioRoutes from './routes/scenarios.js';
import simulateRoutes from './routes/simulate.js';
import compareRoutes from './routes/compare.js';
import templateRoutes from './routes/templates.js';
import exportImportRoutes from './routes/export-import.js';

const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // Error handler
  app.setErrorHandler((error: Error & { validation?: unknown }, request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send(error.toJSON());
    } else if (error.validation) {
      reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });
    } else {
      request.log.error(error);
      reply.code(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    }
  });

  // Plugins
  await app.register(cors, { origin: CORS_ORIGIN });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // Database
  initDatabase();

  // Health
  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  // Routes — paths already include /api/ prefix
  await app.register(projectRoutes);
  await app.register(scenarioRoutes);
  await app.register(simulateRoutes);
  await app.register(compareRoutes);
  await app.register(templateRoutes);
  await app.register(exportImportRoutes);

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down...`);
      await app.close();
      process.exit(0);
    });
  }

  // Start
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`FlowSim API running on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
