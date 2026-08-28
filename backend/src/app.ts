import express from 'express';
import { config } from './config/env';
import { applySecurity } from './middleware/security';
import { apiLimiter, extractionLimiter } from './middleware/rateLimit';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { createEmailRouter } from './controllers/email.controller';
import { createDnsRouter } from './controllers/dns.controller';
import { logger } from './utils/logger';

export function createApp(): express.Express {
  const app = express();

  applySecurity(app);

  app.use('/api', apiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      maxExtractionCount: config.maxExtractionCount,
    });
  });

  app.use('/api', extractionLimiter, createEmailRouter());
  app.use('/api', createDnsRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info('MailCMH API initialized');

  return app;
}
