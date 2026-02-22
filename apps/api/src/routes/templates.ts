import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NotFound } from '../lib/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Templates directory at repo root
const TEMPLATES_DIR = path.resolve(__dirname, '../../../../templates');

interface Template {
  slug: string;
  name: string;
  description: string;
  model: unknown;
}

/**
 * Read all template JSON files from the templates directory.
 */
function loadTemplates(): Template[] {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    return [];
  }

  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'));
  const templates: Template[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(TEMPLATES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      const slug = path.basename(file, '.json');

      templates.push({
        slug,
        name: data.name || slug,
        description: data.description || '',
        model: data.model || data,
      });
    } catch {
      // Skip invalid files
    }
  }

  return templates;
}

const templateRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /api/templates ────────────────────────────────────────

  fastify.get('/api/templates', async () => {
    const templates = loadTemplates();
    return templates.map(({ slug, name, description }) => ({
      slug,
      name,
      description,
    }));
  });

  // ── GET /api/templates/:slug ──────────────────────────────────

  fastify.get<{ Params: { slug: string } }>(
    '/api/templates/:slug',
    async (request) => {
      const templates = loadTemplates();
      const template = templates.find((t) => t.slug === request.params.slug);

      if (!template) {
        throw NotFound('Template', request.params.slug);
      }

      return template;
    },
  );
};

export default templateRoutes;
