import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { imapService } from '../services/imap.service';
import { exportService } from '../services/export.service';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import type { ExtractField } from '../types';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
});

const extractSchema = credentialsSchema.extend({
  folders: z.array(z.string()).min(1),
  startFrom: z.number().int().min(1).default(1),
  count: z.number().int().min(1).max(config.maxExtractionCount),
  fields: z.array(z.string()).min(1),
});

const exportSchema = z.object({
  data: z.array(z.record(z.string())),
  fields: z.array(z.string()).min(1),
  format: z.enum(['csv', 'json', 'xlsx', 'txt']),
});

const activeExtractions = new Map<string, boolean>();

export function createEmailRouter(): Router {
  const router = Router();

  router.post('/email/test-connection', async (req: Request, res: Response) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }
    try {
      const result = await imapService.testConnection(parsed.data);
      res.json({ success: result.success, provider: result.provider, error: result.error });
    } catch (err) {
      logger.error('Test connection error', { error: String(err) });
      res.status(500).json({ success: false, error: 'An unexpected error occurred.' });
    }
  });

  router.post('/email/folders', async (req: Request, res: Response) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }
    try {
      const folders = await imapService.listFolders(parsed.data);
      res.json({ success: true, folders });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list folders.';
      res.status(500).json({ success: false, error: message });
    }
  });

  router.post('/email/extract', async (req: Request, res: Response) => {
    const parsed = extractSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }

    const { email } = parsed.data;
    const jobId = `${email}-${Date.now()}`;

    if (activeExtractions.size >= config.maxConcurrentExtractions) {
      res.status(429).json({ success: false, error: 'Too many concurrent extractions. Please wait and try again.' });
      return;
    }

    activeExtractions.set(jobId, true);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let aborted = false;
    req.on('close', () => {
      aborted = true;
      activeExtractions.delete(jobId);
    });

    const sendEvent = (data: Record<string, unknown>): void => {
      if (!aborted && !res.writableEnded) {
        try {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch { /* client disconnected */ }
      }
    };

    try {
      const results: import('../types').EmailData[] = [];
      const fields = parsed.data.fields as ExtractField[];
      const options = {
        folders: parsed.data.folders,
        startFrom: parsed.data.startFrom,
        count: parsed.data.count,
        fields,
      };

      for await (const emailData of imapService.extractEmails(parsed.data, options, (progress) => {
        sendEvent({ type: 'progress', ...progress });
      })) {
        if (aborted) break;
        results.push(emailData);
        sendEvent({ type: 'row', row: emailData });
      }

      if (!aborted) {
        sendEvent({ type: 'complete', results, total: results.length });
        res.end();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed unexpectedly.';
      logger.error('Extraction error', { email: parsed.data.email, error: message });
      sendEvent({ type: 'error', error: message });
      if (!res.writableEnded) res.end();
    } finally {
      activeExtractions.delete(jobId);
    }
  });

  router.post('/email/export', async (req: Request, res: Response) => {
    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }

    try {
      const { data, fields, format } = parsed.data;
      const typedData = data as Record<string, unknown>[];

      const filename = `mailcmh-export-${Date.now()}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.${format}"`);
      res.setHeader('Content-Type', exportService.formatToContentType(format));

      if (format === 'xlsx') {
        const buffer = await exportService.toXLSX(typedData, fields);
        res.send(buffer);
      } else if (format === 'csv') {
        res.send(exportService.toCSV(typedData, fields));
      } else if (format === 'json') {
        res.send(exportService.toJSON(typedData, fields));
      } else {
        res.send(exportService.toTXT(typedData));
      }
    } catch (err) {
      logger.error('Export error', { error: String(err) });
      res.status(500).json({ success: false, error: 'Export failed.' });
    }
  });

  return router;
}
