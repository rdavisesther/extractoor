/**
 * History persistence layer.
 * Implements a HistoryStore interface backed by SQLite, with an in-memory
 * fallback used in tests and serverless-like environments.
 */
import { type SqliteDb } from '../db/database';
import type { Category, HistoryRecord, OutputFormat } from '../types';

export interface NewHistoryRecord {
  domains: string[];
  count: number;
  categories: Category[];
  format: OutputFormat;
  unique: number;
  duplicatesRemoved: number;
  generationTimeMs: number;
  results: string[];
}

export interface HistoryStore {
  insert(record: NewHistoryRecord): HistoryRecord;
  list(limit: number, offset: number): { items: HistoryRecord[]; total: number };
  getById(id: number): HistoryRecord | undefined;
  remove(id: number): boolean;
  clear(): number;
  close(): void;
}

const ROW_COLS = [
  'id',
  'domains',
  'count',
  'categories',
  'format',
  'unique_count',
  'duplicates_removed',
  'generation_time_ms',
  'results',
  'created_at',
].join(', ');

function mapRow(row: Record<string, unknown>): HistoryRecord {
  return {
    id: row.id as number,
    domains: JSON.parse(row.domains as string),
    count: row.count as number,
    categories: JSON.parse(row.categories as string) as Category[],
    format: row.format as OutputFormat,
    unique: row.unique_count as number,
    duplicatesRemoved: row.duplicates_removed as number,
    generationTimeMs: row.generation_time_ms as number,
    results: JSON.parse(row.results as string),
    createdAt: row.created_at as string,
  };
}

export class SqliteHistoryStore implements HistoryStore {
  constructor(private readonly db: SqliteDb) {}

  insert(record: NewHistoryRecord): HistoryRecord {
    const stmt = this.db.prepare(
      `INSERT INTO history
        (domains, count, categories, format, unique_count, duplicates_removed, generation_time_ms, results)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const result = stmt.run(
      JSON.stringify(record.domains),
      record.count,
      JSON.stringify(record.categories),
      record.format,
      record.unique,
      record.duplicatesRemoved,
      record.generationTimeMs,
      JSON.stringify(record.results),
    );
    const row = this.db
      .prepare(`SELECT ${ROW_COLS} FROM history WHERE id = ?`)
      .get(result.lastInsertRowid) as Record<string, unknown>;
    return mapRow(row);
  }

  list(limit: number, offset: number): { items: HistoryRecord[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) AS n FROM history').get() as { n: number }).n;
    const rows = this.db
      .prepare(`SELECT ${ROW_COLS} FROM history ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(limit, offset) as Record<string, unknown>[];
    return { items: rows.map(mapRow), total };
  }

  getById(id: number): HistoryRecord | undefined {
    const row = this.db
      .prepare(`SELECT ${ROW_COLS} FROM history WHERE id = ?`)
      .get(id) as Record<string, unknown> | undefined;
    return row ? mapRow(row) : undefined;
  }

  remove(id: number): boolean {
    return this.db.prepare('DELETE FROM history WHERE id = ?').run(id).changes > 0;
  }

  clear(): number {
    const result = this.db.prepare('DELETE FROM history').run();
    this.db.prepare("DELETE FROM sqlite_sequence WHERE name = 'history'").run();
    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}

interface MemoryRow {
  id: number;
  createdAt: string;
  record: NewHistoryRecord;
}

export class MemoryHistoryStore implements HistoryStore {
  private rows: MemoryRow[] = [];
  private nextId = 1;

  insert(record: NewHistoryRecord): HistoryRecord {
    const row: MemoryRow = {
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      record,
    };
    this.rows.unshift(row);
    return {
      id: row.id,
      createdAt: row.createdAt,
      ...record,
    };
  }

  list(limit: number, offset: number): { items: HistoryRecord[]; total: number } {
    return {
      items: this.rows.slice(offset, offset + limit).map((r) => ({ id: r.id, createdAt: r.createdAt, ...r.record })),
      total: this.rows.length,
    };
  }

  getById(id: number): HistoryRecord | undefined {
    const row = this.rows.find((r) => r.id === id);
    return row ? { id: row.id, createdAt: row.createdAt, ...row.record } : undefined;
  }

  remove(id: number): boolean {
    const index = this.rows.findIndex((r) => r.id === id);
    if (index === -1) return false;
    this.rows.splice(index, 1);
    return true;
  }

  clear(): number {
    const n = this.rows.length;
    this.rows = [];
    return n;
  }

  close(): void {
    this.rows = [];
  }
}
