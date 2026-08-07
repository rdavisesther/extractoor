import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryHistoryStore, SqliteHistoryStore } from '../src/services/history.store';
import { openDatabase } from '../src/db/database';
import type { NewHistoryRecord } from '../src/services/history.store';

const sample = (): NewHistoryRecord => ({
  domains: ['example.com'],
  count: 100,
  categories: ['email', 'security'],
  format: 'subdomain',
  unique: 100,
  duplicatesRemoved: 0,
  generationTimeMs: 12,
  results: Array.from({ length: 100 }, (_, i) => `mail${i}.example.com`),
});

describe('MemoryHistoryStore', () => {
  let store: MemoryHistoryStore;
  beforeEach(() => {
    store = new MemoryHistoryStore();
  });

  it('inserts and reads records', () => {
    const rec = store.insert(sample());
    expect(rec.id).toBe(1);
    expect(store.getById(1)?.results.length).toBe(100);
  });

  it('lists newest first with pagination', () => {
    store.insert(sample());
    store.insert(sample());
    const page = store.list(1, 0);
    expect(page.total).toBe(2);
    expect(page.items.length).toBe(1);
    expect(page.items[0].id).toBe(2);
  });

  it('removes and clears', () => {
    store.insert(sample());
    expect(store.remove(1)).toBe(true);
    expect(store.remove(1)).toBe(false);
    store.insert(sample());
    expect(store.clear()).toBe(1);
    expect(store.list(10, 0).total).toBe(0);
  });
});

describe('SqliteHistoryStore', () => {
  let store: SqliteHistoryStore;
  beforeEach(() => {
    const db = openDatabase(':memory:');
    store = new SqliteHistoryStore(db);
  });

  it('round-trips a record through sqlite', () => {
    const rec = store.insert(sample());
    const loaded = store.getById(rec.id);
    expect(loaded?.domains).toEqual(['example.com']);
    expect(loaded?.results.length).toBe(100);
    expect(loaded?.createdAt).toBeTruthy();
  });

  it('lists records in descending id order', () => {
    store.insert(sample());
    store.insert(sample());
    const { items } = store.list(10, 0);
    expect(items[0].id).toBe(2);
    expect(items[1].id).toBe(1);
  });
});
