/**
 * Database bootstrap using better-sqlite3.
 *
 * SQLite is used in development. The schema is PostgreSQL-compatible so the
 * history store can be swapped for Postgres in production without changing
 * the domain layer.
 *
 * The native module is loaded lazily so serverless environments (Vercel)
 * gracefully fall back to the in-memory history store when the binary cannot
 * be loaded.
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domains TEXT NOT NULL,
  count INTEGER NOT NULL,
  categories TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'subdomain',
  unique_count INTEGER NOT NULL DEFAULT 0,
  duplicates_removed INTEGER NOT NULL DEFAULT 0,
  generation_time_ms INTEGER NOT NULL DEFAULT 0,
  results TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_history_created_at ON history (created_at DESC);
`;

type DatabaseCtor = typeof import('better-sqlite3');

export type SqliteDb = InstanceType<DatabaseCtor>;

/**
 * Opens (and creates) the SQLite database.
 * Returns `null` when the native module is unavailable or the filesystem is
 * read-only (serverless) — callers fall back to the in-memory history store.
 */
export function openDatabase(path: string): SqliteDb | null {
  let Database: DatabaseCtor;
  try {
    // Lazy require keeps serverless bundles from crashing when the native
    // binary is missing (it degrades to the memory store instead).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('better-sqlite3');
    Database = mod.default ?? mod;
  } catch {
    return null;
  }

  if (path !== ':memory:') {
    try {
      mkdirSync(dirname(path), { recursive: true });
    } catch {
      // directory may already exist or FS is read-only; continue below
    }
  }
  try {
    const db = new Database(path);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.exec(SCHEMA);
    return db;
  } catch {
    return null;
  }
}
