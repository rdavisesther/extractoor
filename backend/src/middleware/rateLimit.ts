/**
 * Rate limiting per IP.
 */
import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});

export const generateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: Math.max(20, Math.floor(config.rateLimitMax / 3)),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Generate rate limit reached. Please slow down.',
  },
});
