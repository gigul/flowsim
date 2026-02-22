import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: BetterSqlite3.Database | null = null;

/**
 * Initialize the SQLite database and ensure all tables exist.
 * Uses WAL mode for better concurrent read performance.
 */
export function initDatabase(dbPath: string = 'flowsim.db') {
  sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      model_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS simulation_runs (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      config_json TEXT NOT NULL,
      result_json TEXT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_scenarios_project_id ON scenarios(project_id);
    CREATE INDEX IF NOT EXISTS idx_simulation_runs_scenario_id ON simulation_runs(scenario_id);
    CREATE INDEX IF NOT EXISTS idx_simulation_runs_status ON simulation_runs(status);
  `);

  db = drizzle(sqlite, { schema });
  return db;
}

/**
 * Get the current database instance. Throws if not initialized.
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Get the raw SQLite instance for direct queries.
 */
export function getSqlite(): BetterSqlite3.Database {
  if (!sqlite) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return sqlite;
}

/**
 * Close the database connection gracefully.
 */
export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}
