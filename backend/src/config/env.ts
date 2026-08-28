export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  extractionRateLimitMax: number;
  maxExtractionCount: number;
  maxConcurrentExtractions: number;
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
  extractionRateLimitMax: toInt(process.env.EXTRACTION_RATE_LIMIT_MAX, 10),
  maxExtractionCount: toInt(process.env.MAX_EXTRACTION_COUNT, 1000),
  maxConcurrentExtractions: toInt(process.env.MAX_CONCURRENT_EXTRACTIONS, 5),
  isProd: process.env.NODE_ENV === 'production',
};
