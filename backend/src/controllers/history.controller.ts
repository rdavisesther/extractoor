/**
 * History controller - list, fetch, delete, and export past generations.
 */
import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import type { HistoryService } from '../services/history.service';
import { buildExport, type ExportFormat } from '../services/exporter.service';

const EXPORT_FORMATS: ExportFormat[] = ['txt', 'csv', 'json', 'xlsx'];

function parseId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'Invalid history id.');
  return id;
}

export function createHistoryRouter(history: HistoryService): Router {
  const router = Router();

  /** GET /api/history?limit=20&offset=0 */
  router.get('/history', (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const result = history.list(limit, offset);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/history/:id */
  router.get('/history/:id', (req, res, next) => {
    try {
      const record = history.getById(parseId(req.params.id));
      if (!record) throw new AppError(404, 'History record not found.');
      res.json({ success: true, record });
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/history/:id/export?format=txt|csv|json|xlsx */
  router.get('/history/:id/export', async (req, res, next) => {
    try {
      const format = String(req.query.format ?? 'txt') as ExportFormat;
      if (!EXPORT_FORMATS.includes(format)) {
        throw new AppError(400, `Unsupported export format. Use ${EXPORT_FORMATS.join('|')}.`);
      }
      const record = history.getById(parseId(req.params.id));
      if (!record) throw new AppError(404, 'History record not found.');

      const file = await buildExport(format, record.results, {
        domains: record.domains,
        generatedAt: record.createdAt,
      });
      res.setHeader('Content-Type', file.mime);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(file.content);
    } catch (err) {
      next(err);
    }
  });

  /** DELETE /api/history/:id */
  router.delete('/history/:id', (req, res, next) => {
    try {
      const removed = history.remove(parseId(req.params.id));
      if (!removed) throw new AppError(404, 'History record not found.');
      res.json({ success: true, removed });
    } catch (err) {
      next(err);
    }
  });

  /** DELETE /api/history */
  router.delete('/history', (req, res, next) => {
    try {
      const removed = history.clear();
      res.json({ success: true, removed });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
