/**
 * Security middleware: helmet + CORS + JSON body parsing limits.
 */
import helmet from 'helmet';
import cors from 'cors';
import express from 'express';
import { config } from '../config/env';

/** Parses the CORS_ORIGIN env value: "*", a single origin, or a comma list. */
function resolveCorsOrigin(): string | string[] {
  const value = config.corsOrigin;
  if (value === '*') return '*';
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function applySecurity(app: express.Express): void {
  app.use(helmet());

  app.use(
    cors({
      origin: resolveCorsOrigin(),
      methods: ['GET', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
}
