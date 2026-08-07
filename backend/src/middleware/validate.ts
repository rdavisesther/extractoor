/**
 * Request validation middleware using Zod schemas.
 * Prevents malformed / oversized / XSS-carrying payloads from reaching
 * the generator, and normalizes user input before it is used.
 */
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CATEGORIES, OUTPUT_FORMATS } from '../types';
import {
  isValidDomain,
  normalizeDomain,
  parseDomains,
  sanitizePrefix,
} from '../utils/validation';

const patternSchema = z.object({
  enabled: z.boolean().default(false),
  bases: z.array(z.string().max(80)).max(50).default([]),
  start: z.number().int().min(0).max(1_000_000).default(1),
  digits: z.number().int().min(1).max(8).default(2),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

export const generateSchema = z.object({
  domains: z.array(z.string().max(255)).min(1).max(1000),
  count: z.number().int().min(1).max(1_000_000).default(1000),
  categories: z.array(z.enum(CATEGORIES)).max(50).default([]),
  customPrefixes: z.array(z.string().max(80)).max(500).default([]),
  pattern: patternSchema.default({
    enabled: false,
    bases: [],
    start: 1,
    digits: 2,
    direction: 'asc',
  }),
  randomMode: z.boolean().default(false),
  aiMode: z.boolean().default(false),
  format: z.enum(OUTPUT_FORMATS).default('subdomain'),
  requestId: z.string().max(64).optional(),
});

export type GenerateSchema = z.infer<typeof generateSchema>;

/** Validates and normalizes a generate request body. */
export function parseGenerateBody(body: unknown): {
  ok: true;
  data: z.infer<typeof generateSchema>;
} | {
  ok: false;
  error: string;
  details: Record<string, unknown>;
} {
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Invalid request body.',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // Normalize + validate domains; drop invalid ones.
  const validDomains = parseDomains(data.domains.join('\n'))
    .map(normalizeDomain)
    .filter(isValidDomain);
  const invalidCount = new Set(data.domains.map(normalizeDomain)).size - validDomains.length;

  if (validDomains.length === 0) {
    return { ok: false, error: 'No valid domains provided.', details: { invalidCount } };
  }

  // Sanitize custom prefixes to DNS-safe labels.
  const customPrefixes = data.customPrefixes
    .map((p) => sanitizePrefix(p))
    .filter((p) => p.length > 0);

  return {
    ok: true,
    data: {
      ...data,
      domains: validDomains,
      customPrefixes,
    },
  };
}

/** Zod-based body validator factory. */
export function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request body.',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
