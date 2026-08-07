/**
 * History service - thin wrapper over the persistence store.
 */
import { type HistoryStore, type NewHistoryRecord } from './history.store';
import type { HistoryRecord } from '../types';

export class HistoryService {
  constructor(private readonly store: HistoryStore) {}

  save(record: NewHistoryRecord): HistoryRecord {
    return this.store.insert(record);
  }

  list(limit = 20, offset = 0): { items: HistoryRecord[]; total: number } {
    return this.store.list(limit, offset);
  }

  getById(id: number): HistoryRecord | undefined {
    return this.store.getById(id);
  }

  remove(id: number): boolean {
    return this.store.remove(id);
  }

  clear(): number {
    return this.store.clear();
  }
}
