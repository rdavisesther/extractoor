type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let threshold = LEVELS['info'];

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return;
  const stamp = new Date().toISOString();
  const safeMeta = meta ? sanitizeMeta(meta) : undefined;
  const extra = safeMeta !== undefined ? ` ${JSON.stringify(safeMeta)}` : '';
  const line = `[${stamp}] [${level.toUpperCase()}] ${message}${extra}`;
  if (level === 'error' || level === 'warn') {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

const SENSITIVE_KEYS = new Set([
  'password', 'pass', 'secret', 'token', 'apikey', 'api_key',
  'authorization', 'credential', 'app_password', 'appPassword',
]);

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      clean[key] = sanitizeMeta(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};

export const silenceLogs = (): void => {
  const quiet = (): void => undefined;
  logger.debug = quiet;
  logger.info = quiet;
  logger.warn = quiet;
  logger.error = quiet;
};

export function setLogLevel(level: Level): void {
  threshold = LEVELS[level];
}
