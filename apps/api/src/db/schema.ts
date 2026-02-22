import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ── Projects ───────────────────────────────────────────────────────

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

// ── Scenarios ──────────────────────────────────────────────────────

export const scenarios = sqliteTable('scenarios', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  modelJson: text('model_json').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

// ── Simulation Runs ────────────────────────────────────────────────

export const simulationRuns = sqliteTable('simulation_runs', {
  id: text('id').primaryKey(),
  scenarioId: text('scenario_id')
    .notNull()
    .references(() => scenarios.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  configJson: text('config_json').notNull(),
  resultJson: text('result_json'),
  startedAt: integer('started_at', { mode: 'number' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'number' }),
  error: text('error'),
});
