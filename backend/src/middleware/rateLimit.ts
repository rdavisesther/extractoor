import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/**
 * Resolves the client IP for rate limiting.
 * On Vercel (and behind proxies) the real client IP is in X-Forwarded-For.
 */
function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req: Request) => clientIp(req),
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});

export const extractionLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.extractionRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req: Request) => clientIp(req),
  message: {
    success: false,
    error: 'Extraction rate limit reached. Please wait before starting another extraction.',
  },
});
