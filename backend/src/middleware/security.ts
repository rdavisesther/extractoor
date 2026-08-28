import helmet from 'helmet';
import cors from 'cors';
import express from 'express';
import { config } from '../config/env';

function resolveCorsOrigin(): string | string[] {
  const value = config.corsOrigin;
  if (value === '*') return '*';
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function applySecurity(app: express.Express): void {
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(
    cors({
      origin: resolveCorsOrigin(),
      methods: ['GET', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: false, limit: '5mb' }));
}
