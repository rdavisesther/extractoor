/**
 * Pure subdomain generation logic.
 * Shared by the inline (main thread) path and the worker threads.
 */
import type { OutputFormat } from '../types';

export interface GenerateJob {
  /** Root domains, e.g. ["example.com"]. */
  domains: string[];
  /** Ordered prefix pool, e.g. ["mail", "www", ...]. */
  prefixes: string[];
  /** Maximum number of results this job should produce. */
  share: number;
  /** Output formatting. */
  format: OutputFormat;
}

/** Renders a single subdomain according to the requested output format. */
export function formatSubdomain(prefix: string, domain: string, format: OutputFormat): string {
  const host = `${prefix}.${domain}`;
  if (format === 'https') return `https://${host}`;
  if (format === 'http') return `http://${host}`;
  return host;
}

/**
 * Generates up to `share` subdomains by walking the prefix pool and applying
 * every prefix to every domain, stopping once the share is reached.
 * Duplicates within the job are skipped and counted.
 */
export function generateForJob(job: GenerateJob): { results: string[]; duplicates: number } {
  const { domains, prefixes, share, format } = job;
  const seen = new Set<string>();
  const out: string[] = [];
  let duplicates = 0;

  for (const prefix of prefixes) {
    for (const domain of domains) {
      const sub = formatSubdomain(prefix, domain, format);
      if (seen.has(sub)) {
        duplicates++;
        continue;
      }
      seen.add(sub);
      out.push(sub);
      if (out.length >= share) return { results: out, duplicates };
    }
  }
  return { results: out, duplicates };
}

/** Pads an integer to at least `digits` digits, e.g. (1, 3) -> "001". */
export function padNumber(value: number, digits: number): string {
  return String(value).padStart(Math.max(digits, 1), '0');
}

/**
 * Builds the ordered prefix list for the pattern generator.
 * Each base supports an optional digit count suffix, e.g. "mail" or "server:3".
 * Numbers increment per series, so bases interleave as:
 *   mail01, mx01, smtp01, mail02, mx02, smtp02 ...
 */
export function buildPatternPrefixes(
  bases: string[],
  start: number,
  digits: number,
  direction: 'asc' | 'desc',
  count: number,
): string[] {
  const parsed = bases
    .map((base) => {
      const [name, digitOverride] = base.split(':');
      return { name: name.trim().toLowerCase(), digits: digitOverride ? Number(digitOverride) : digits };
    })
    .filter((b) => b.name.length > 0 && /^[a-z0-9-]{1,63}$/.test(b.name));

  if (parsed.length === 0) return [];

  const countPerBase = Math.ceil(count / parsed.length);
  const highest = start + countPerBase - 1;
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    const base = parsed[i % parsed.length];
    const series = Math.floor(i / parsed.length);
    const num = direction === 'desc' ? highest - series : start + series;
    result.push(`${base.name}${padNumber(num, base.digits)}`);
  }
  return result;
}
