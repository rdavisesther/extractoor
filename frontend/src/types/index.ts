/** Mirrors the backend API contracts. */

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

export const OUTPUT_FORMATS = ['subdomain', 'https', 'http'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const SORT_MODES = ['alphabetical', 'reverse', 'length', 'random'] as const;
export type SortMode = (typeof SORT_MODES)[number];

export type PatternDirection = 'asc' | 'desc';

export interface PatternConfig {
  enabled: boolean;
  bases: string[];
  start: number;
  digits: number;
  direction: PatternDirection;
}

export interface GenerateRequest {
  domains: string[];
  count: number;
  categories: Category[];
  customPrefixes: string[];
  pattern: PatternConfig;
  randomMode: boolean;
  aiMode: boolean;
  format: OutputFormat;
  requestId?: string;
}

export interface GenerateResponse {
  success: true;
  total: number;
  unique: number;
  duplicatesRemoved: number;
  generationTimeMs: number;
  historyId?: number;
  results: string[];
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, unknown>;
}

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

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  timestamp: string;
  workers: number;
  dictionarySize: number;
  db: 'sqlite' | 'memory';
}
