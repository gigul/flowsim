import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { initDatabase } from './db/migrate.js';
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

  // Plugins
  await app.register(cors, { origin: CORS_ORIGIN });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // Database
  initDatabase();

  // Health
  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  // Routes
  await app.register(projectRoutes, { prefix: '/api' });
  await app.register(scenarioRoutes, { prefix: '/api' });
  await app.register(simulateRoutes, { prefix: '/api' });
  await app.register(compareRoutes, { prefix: '/api' });
  await app.register(templateRoutes, { prefix: '/api' });
  await app.register(exportImportRoutes, { prefix: '/api' });

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
