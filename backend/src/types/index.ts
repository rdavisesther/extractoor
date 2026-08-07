/**
 * Shared request/response contracts for the Subdomain Generator API.
 * Mirrored by the frontend `src/types/index.ts`.
 */

/** Available prefix categories. */
export const CATEGORIES = [
  'common',
  'business',
  'corporate',
  'security',
  'cloud',
  'hosting',
  'api',
  'finance',
  'insurance',
  'education',
  'medical',
  'technology',
  'government',
  'email',
  'marketing',
  'ecommerce',
  'streaming',
  'gaming',
  'ai',
  'crypto',
  'random',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Output formats the generator can produce. */
export const OUTPUT_FORMATS = ['subdomain', 'https', 'http'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

/** Sort strategies applied client side. */
export const SORT_MODES = ['alphabetical', 'reverse', 'length', 'random'] as const;
export type SortMode = (typeof SORT_MODES)[number];

/** Pattern generator direction. */
export type PatternDirection = 'asc' | 'desc';

/** Configuration for the pattern generator (e.g. mail01, mail02...). */
export interface PatternConfig {
  enabled: boolean;
  /** Base prefixes, e.g. ["mail", "mx", "smtp"]. */
  bases: string[];
  /** Starting integer. */
  start: number;
  /** Number of padded digits, e.g. 2 -> 01. */
  digits: number;
  /** Ascending or descending order. */
  direction: PatternDirection;
}

/** Full generate request body. */
export interface GenerateRequest {
  /** Root domains, e.g. ["example.com"]. */
  domains: string[];
  /** How many subdomains to produce. */
  count: number;
  /** Selected categories; empty means every category. */
  categories: Category[];
  /** Extra user prefixes. */
  customPrefixes: string[];
  /** Pattern generator config. */
  pattern: PatternConfig;
  /** Random readable-prefix mode. */
  randomMode: boolean;
  /** AI smart generator mode (curated realistic prefixes). */
  aiMode: boolean;
  /** Output formatting. */
  format: OutputFormat;
  /** Unique run id supplied by the client for progress correlation. */
  requestId?: string;
}

/** Statistics attached to every generation run. */
export interface GenerationStats {
  total: number;
  unique: number;
  duplicatesRemoved: number;
  generationTimeMs: number;
  domainsUsed: number;
}

/** API success response. */
export interface GenerateResponse {
  success: true;
  total: number;
  unique: number;
  duplicatesRemoved: number;
  generationTimeMs: number;
  results: string[];
}

/** API error response. */
export interface ErrorResponse {
  success: false;
  error: string;
  details?: Record<string, unknown>;
}

/** History record. */
export interface HistoryRecord {
  id: number;
  domains: string[];
  count: number;
  categories: Category[];
  format: OutputFormat;
  unique: number;
  duplicatesRemoved: number;
  generationTimeMs: number;
  results: string[];
  createdAt: string;
}

/** Health check response. */
export interface HealthResponse {
  status: 'ok';
  uptime: number;
  timestamp: string;
  workers: number;
  dictionarySize: number;
  db: 'sqlite' | 'memory';
}
