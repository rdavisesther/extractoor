/**
 * Express application assembly with dependency wiring.
 */
import express from 'express';
import { config } from './config/env';
import { openDatabase } from './db/database';
import { SqliteHistoryStore, MemoryHistoryStore, type HistoryStore } from './services/history.store';
import { HistoryService } from './services/history.service';
import { createGenerateRouter } from './controllers/generate.controller';
import { createHistoryRouter } from './controllers/history.controller';
import { applySecurity } from './middleware/security';
import { apiLimiter } from './middleware/rateLimit';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { dictionarySize } from './services/dictionary.service';
import { getPool } from './workers/workerPool';

export interface AppServices {
  history: HistoryService;
  store: HistoryStore;
}

/** Builds the Express app and its service graph. */
export function createApp(options?: { databasePath?: string }): {
  app: express.Express;
  services: AppServices;
} {
  const app = express();

  applySecurity(app);

  // Persistence: SQLite in normal environments, in-memory fallback for tests/serverless.
  const databasePath = options?.databasePath ?? config.databasePath;
  let store: HistoryStore;
  try {
    const db = openDatabase(databasePath);
    store = db ? new SqliteHistoryStore(db) : new MemoryHistoryStore();
  } catch {
    store = new MemoryHistoryStore();
  }
  const history = new HistoryService(store);

  app.use('/api', apiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      workers: getPool().count,
      dictionarySize: dictionarySize(),
      db: store instanceof SqliteHistoryStore ? 'sqlite' : 'memory',
    });
  });
  app.use('/api', createGenerateRouter(history));
  app.use('/api', createHistoryRouter(history));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, services: { history, store } };
}
