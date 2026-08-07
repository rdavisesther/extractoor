/**
 * Minimal structured logger with timestamps.
 * Safe to use in worker threads (falls back to plain stdout in threads).
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function write(level: Level, message: string, meta?: unknown): void {
  if (LEVELS[level] < threshold) return;
  const stamp = new Date().toISOString();
  const line = `[${stamp}] [${level.toUpperCase()}] ${message}`;
  const extra = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
  if (level === 'error' || level === 'warn') {
    process.stderr.write(`${line}${extra}\n`);
  } else {
    process.stdout.write(`${line}${extra}\n`);
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
};

export const silenceLogs = (): void => {
  const quiet = (): void => undefined;
  logger.debug = quiet;
  logger.info = quiet;
  logger.warn = quiet;
  logger.error = quiet;
};

// Track current level threshold (used by tests to silence output).
let threshold = LEVELS['info'];

export function setLogLevel(level: Level): void {
  threshold = LEVELS[level];
}
