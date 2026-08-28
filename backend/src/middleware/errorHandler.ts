import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: 'Route not found.' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({ success: false, error: 'Malformed JSON body.' });
    return;
  }

  logger.error('Unhandled error', { message: err instanceof Error ? err.message : String(err) });
  res.status(500).json({ success: false, error: 'Internal server error.' });
}
