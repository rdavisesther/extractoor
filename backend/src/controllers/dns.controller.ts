import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { dnsService, getSupportedDnsTypes } from '../services/dns.service';
import { logger } from '../utils/logger';

const dnsQuerySchema = z.object({
  domain: z.string().min(1).max(253),
  types: z.array(z.string()).min(1),
});

export function createDnsRouter(): Router {
  const router = Router();

  router.get('/dns/types', (_req: Request, res: Response) => {
    res.json({ success: true, types: getSupportedDnsTypes() });
  });

  router.post('/dns/lookup', async (req: Request, res: Response) => {
    const parsed = dnsQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }

    try {
      const result = await dnsService.lookup(parsed.data);
      res.json({ success: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'DNS lookup failed.';
      logger.error('DNS lookup error', { domain: parsed.data.domain, error: message });
      res.status(500).json({ success: false, error: message });
    }
  });

  return router;
}
