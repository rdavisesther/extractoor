/**
 * Generation controller.
 */
import { Router } from 'express';
import { generateLimiter } from '../middleware/rateLimit';
import { parseGenerateBody, type GenerateSchema } from '../middleware/validate';
import { generateSubdomains } from '../services/generator.service';
import type { HistoryService } from '../services/history.service';

export function createGenerateRouter(history: HistoryService): Router {
  const router = Router();

  /**
   * POST /api/generate
   * Generates subdomains and stores the run in history.
   */
  router.post('/generate', generateLimiter, async (req, res, next) => {
    try {
      const result = parseGenerateBody(req.body);
      if (!result.ok) {
        res.status(400).json({ success: false, error: result.error, details: result.details });
        return;
      }

      const data: GenerateSchema = result.data;
      const { results, stats } = await generateSubdomains({
        domains: data.domains,
        count: data.count,
        categories: data.categories,
        customPrefixes: data.customPrefixes,
        pattern: data.pattern,
        randomMode: data.randomMode,
        aiMode: data.aiMode,
        format: data.format,
        requestId: data.requestId,
      });

      let historyId: number | undefined;
      try {
        const record = history.save({
          domains: data.domains,
          count: data.count,
          categories: data.categories,
          format: data.format,
          unique: stats.unique,
          duplicatesRemoved: stats.duplicatesRemoved,
          generationTimeMs: stats.generationTimeMs,
          results,
        });
        historyId = record.id;
      } catch (err) {
        // History persistence must never break a successful generation.
        void err;
      }

      res.json({
        success: true,
        total: stats.total,
        unique: stats.unique,
        duplicatesRemoved: stats.duplicatesRemoved,
        generationTimeMs: stats.generationTimeMs,
        historyId,
        results,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
