/**
 * Input validation and sanitization utilities.
 * Every user-supplied value passes through here before use.
 */

/** Public suffix list is intentionally simple: last label must contain a dot and a letter. */
const DOMAIN_RE =
  /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?!-)[a-z]{2,63}$/i;

const PREFIX_RE = /^[a-z0-9][a-z0-9-]{0,62}$/i;

/**
 * Validates a single root domain.
 * Accepts "example.com", "sub.example.co.uk", rejects IPs and invalid labels.
 */
export function isValidDomain(value: string): boolean {
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//i, '');
  if (!trimmed || trimmed.includes('/') || trimmed.includes('@')) return false;
  if (!DOMAIN_RE.test(trimmed)) return false;
  const labels = trimmed.split('.');
  return labels.length >= 2;
}

/** Strips a single label (prefix) to a safe DNS-safe form. */
export function sanitizePrefix(value: string): string {
  const clean = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean.length > 63 ? clean.slice(0, 63) : clean;
}

/** Validates a single user-supplied prefix. */
export function isValidPrefix(value: string): boolean {
  const clean = value.trim().toLowerCase();
  return PREFIX_RE.test(clean);
}

/** Sanitizes arbitrary user text to prevent XSS in generated output. */
export function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, (ch) => (ch === '<' ? '&lt;' : '&gt;')).trim();
}

/** Removes duplicate lines from a text block. */
export function uniqueLines(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

/** Parses raw textarea input into a list of deduplicated domains. */
export function parseDomains(value: string): string[] {
  return uniqueLines(value).map((d) => d.toLowerCase());
}

/** Normalizes a domain to lowercase, strip scheme, strip trailing slash. */
export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

/** Keeps only the first column of a CSV line (handles simple quoted cells). */
export function firstCsvColumn(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('"')) {
    const match = trimmed.match(/^"((?:[^"]|"")*)"/);
    return match ? match[1].replace(/""/g, '"') : '';
  }
  return trimmed.split(',')[0].trim();
}
