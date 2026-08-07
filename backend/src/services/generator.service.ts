/**
 * Generator service.
 * Orchestrates prefix selection, worker-parallel generation, global
 * deduplication, fill logic, and statistics.
 */
import { getPool } from '../workers/workerPool';
import { generateForJob, buildPatternPrefixes, formatSubdomain } from './generator.core';
import { resolvePrefixPool } from './dictionary.service';
import type { GenerateRequest, GenerationStats } from '../types';

export interface GenerationResult {
  results: string[];
  stats: GenerationStats;
}

/** Validates the request, returning an error message or null. */
export function validateGenerateRequest(req: GenerateRequest): string | null {
  if (!req.domains || req.domains.length === 0) {
    return 'At least one valid domain is required.';
  }
  if (req.count < 1 || req.count > 1_000_000) {
    return 'Count must be between 1 and 1,000,000.';
  }
  if (req.domains.length > 1000) {
    return 'Maximum of 1000 domains per request.';
  }
  return null;
}

/** Fills any shortfall by appending numbered fallbacks (prefix-1, prefix-2...). */
function fillResults(
  results: string[],
  domains: string[],
  prefixes: string[],
  target: number,
  format: GenerateRequest['format'],
): string[] {
  if (results.length >= target || prefixes.length === 0) return results;
  const seen = new Set(results);
  const out = [...results];

  for (let round = 1; round < 100; round++) {
    for (const prefix of prefixes) {
      for (const domain of domains) {
        const sub = formatSubdomain(`${prefix}-${round}`, domain, format);
        if (seen.has(sub)) continue;
        seen.add(sub);
        out.push(sub);
        if (out.length >= target) return out;
      }
    }
  }
  return out;
}

/**
 * Generates subdomains for the given request.
 * - Small counts run inline (main thread).
 * - Large counts are chunked across worker threads.
 * - Results are globally deduplicated and padded to exactly `count`.
 */
export async function generateSubdomains(req: GenerateRequest): Promise<GenerationResult> {
  const started = performance.now();
  const domains = req.domains.map((d) => d.toLowerCase());

  let prefixes: string[];
  if (req.pattern.enabled) {
    prefixes = buildPatternPrefixes(
      req.pattern.bases,
      req.pattern.start,
      req.pattern.digits,
      req.pattern.direction,
      req.count,
    );
  } else {
    prefixes = resolvePrefixPool(req.categories, req.customPrefixes, req.aiMode, req.randomMode);
  }

  const pool = getPool();
  const { results: raw, duplicates } = await pool.run({
    domains,
    prefixes,
    share: req.count,
    format: req.format,
  });

  // Global dedup across chunks / duplicate prefixes.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of raw) {
    if (seen.has(item)) continue;
    seen.add(item);
    unique.push(item);
  }

  const filled = fillResults(unique, domains, prefixes, req.count, req.format);

  // Order deterministically: keep first-encounter order.
  const finalSeen = new Set<string>();
  const final: string[] = [];
  for (const item of filled) {
    if (finalSeen.has(item)) continue;
    finalSeen.add(item);
    final.push(item);
  }

  return {
    results: final,
    stats: {
      total: final.length,
      unique: finalSeen.size,
      duplicatesRemoved: duplicates,
      generationTimeMs: Math.round(performance.now() - started),
      domainsUsed: domains.length,
    },
  };
}

/** Convenience used by tests and small inline calls. */
export function generateInline(req: GenerateRequest): GenerationResult {
  const started = performance.now();
  const domains = req.domains.map((d) => d.toLowerCase());

  const prefixes =
    req.pattern.enabled
      ? buildPatternPrefixes(
          req.pattern.bases,
          req.pattern.start,
          req.pattern.digits,
          req.pattern.direction,
          req.count,
        )
      : resolvePrefixPool(req.categories, req.customPrefixes, req.aiMode, req.randomMode);

  const { results: raw, duplicates } = generateForJob({
    domains,
    prefixes,
    share: req.count,
    format: req.format,
  });

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of raw) {
    if (seen.has(item)) continue;
    seen.add(item);
    unique.push(item);
  }

  const filled = fillResults(unique, domains, prefixes, req.count, req.format);
  const finalSeen = new Set<string>();
  const final: string[] = [];
  for (const item of filled) {
    if (finalSeen.has(item)) continue;
    finalSeen.add(item);
    final.push(item);
  }

  return {
    results: final,
    stats: {
      total: final.length,
      unique: finalSeen.size,
      duplicatesRemoved: duplicates,
      generationTimeMs: Math.round(performance.now() - started),
      domainsUsed: domains.length,
    },
  };
}
