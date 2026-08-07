/**
 * Central configuration loaded from environment variables.
 * Every value has a safe default so the app runs out of the box.
 */

export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  databasePath: string;
  workerPoolSize: number;
  maxSubdomains: number;
  isProd: boolean;
}

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config: AppConfig = {
  port: toInt(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: toInt(process.env.RATE_LIMIT_MAX, 120),
  databasePath: process.env.DATABASE_PATH ?? './data/subdomain-generator.db',
  workerPoolSize: toInt(process.env.WORKER_POOL_SIZE, 0),
  maxSubdomains: toInt(process.env.MAX_SUBDOMAINS, 1_000_000),
  isProd: process.env.NODE_ENV === 'production',
};
