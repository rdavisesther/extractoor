/**
 * Dictionary service.
 * Loads the generated prefix dictionary lazily and exposes category-aware
 * lookups plus the curated "AI smart" and "random readable" prefix sets.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Category } from '../types';

export interface DictionaryEntry {
  value: string;
  categories: Category[];
}

export interface DictionaryData {
  version: number;
  total: number;
  prefixes: DictionaryEntry[];
}

/** Curated realistic prefixes used by the AI Smart Generator. */
export const AI_SMART_PREFIXES: string[] = [
  'customer-support', 'claims', 'insurance', 'renew', 'billing', 'verify',
  'documents', 'secure', 'payment', 'payments', 'account', 'accounts', 'login',
  'mail', 'portal', 'gateway', 'dashboard', 'support', 'help', 'helpdesk',
  'status', 'api', 'app', 'www', 'blog', 'cdn', 'sso', 'identity', 'auth',
  'profile', 'settings', 'notifications', 'search', 'checkout', 'cart',
  'catalog', 'inventory', 'orders', 'shipping', 'tracking', 'analytics',
  'reports', 'billing', 'invoices', 'tax', 'signup', 'onboarding', 'contact',
  'about', 'careers', 'press', 'newsroom', 'privacy', 'terms', 'faq', 'kb',
  'download', 'upload', 'export', 'import', 'sync', 'webhook', 'webhooks',
  'events', 'docs', 'guides', 'community', 'forum', 'feedback', 'changelog',
  'roadmap', 'pricing', 'enterprise', 'partners', 'affiliates', 'referral',
  'mobile', 'beta', 'alpha', 'staging', 'preview', 'sandbox', 'labs',
];

/** Readable creative prefixes used by Random Mode. */
export const RANDOM_READABLE_PREFIXES: string[] = [
  'horizon', 'prime', 'vertex', 'fusion', 'atlas', 'nova', 'alpha', 'delta',
  'vector', 'summit', 'nebula', 'pixel', 'quartz', 'ember', 'drift', 'echo',
  'orbit', 'pulse', 'ripple', 'solstice', 'zenith', 'cascade', 'inertia',
  'kinetic', 'luminous', 'obsidian', 'phoenix', 'quantum', 'radiant', 'sierra',
  'tempest', 'umbra', 'vapor', 'whisper', 'blaze', 'comet', 'dusk', 'frost',
  'galaxy', 'glimmer', 'harbor', 'ion', 'jade', 'lunar', 'meteor', 'nimbus',
  'opal', 'pearl', 'raven', 'sage', 'thunder', 'valley', 'willow', 'zephyr',
  'apex', 'beacon', 'canyon', 'falcon', 'grove', 'ivory', 'juniper', 'koa',
  'lynx', 'meadow', 'onyx', 'prairie', 'sapphire', 'titan', 'vista',
  'wildfire', 'xenon', 'yonder', 'zest', 'aurora', 'boulder', 'cobalt',
  'dawn', 'elysium', 'fjord', 'granite', 'harbinger', 'iris', 'jubilee',
  'kelvin', 'lagoon', 'monolith', 'nightfall', 'prism', 'quasar', 'reef',
  'stratus', 'tide', 'upsilon', 'vigil', 'wavelength', 'yarrow', 'zigzag',
];

const DICTIONARY_PATH =
  process.env.DICTIONARY_PATH ?? join(__dirname, '..', '..', 'data', 'dictionary.json');

let cached: DictionaryData | null = null;

/** Loads and caches the dictionary. */
export function loadDictionary(): DictionaryData {
  if (cached) return cached;
  const raw = readFileSync(DICTIONARY_PATH, 'utf8');
  cached = JSON.parse(raw) as DictionaryData;
  return cached;
}

export function dictionarySize(): number {
  return loadDictionary().total;
}

/** Returns all prefixes tagged with any of the given categories. */
export function getPrefixesForCategories(categories: Category[]): DictionaryEntry[] {
  const data = loadDictionary();
  if (categories.length === 0) return data.prefixes;
  const wanted = new Set(categories);
  return data.prefixes.filter((entry) =>
    entry.categories.some((c) => wanted.has(c)),
  );
}

/** Merges dictionary prefixes with user-supplied custom prefixes (deduped). */
export function resolvePrefixPool(
  categories: Category[],
  customPrefixes: string[],
  aiMode: boolean,
  randomMode: boolean,
): string[] {
  const seen = new Set<string>();
  const pool: string[] = [];

  const push = (value: string): void => {
    const v = value.trim().toLowerCase();
    if (v && !seen.has(v)) {
      seen.add(v);
      pool.push(v);
    }
  };

  // User-supplied prefixes take priority so they always appear in output.
  customPrefixes.forEach(push);
  if (aiMode) AI_SMART_PREFIXES.forEach(push);
  if (randomMode) RANDOM_READABLE_PREFIXES.forEach(push);
  getPrefixesForCategories(categories).forEach((entry) => push(entry.value));

  return pool;
}
