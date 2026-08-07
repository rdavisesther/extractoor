/** Joins class names, filtering falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Formats large numbers with thousands separators. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/** Formats milliseconds as a human-readable duration. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

/** Formats an ISO timestamp for display. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Parses domains from raw textarea input (one per line, deduplicated). */
export function parseDomainLines(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.trim().toLowerCase();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

/** Extracts the first column of a CSV line (handles simple quoted cells). */
export function firstCsvColumn(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('"')) {
    const match = trimmed.match(/^"((?:[^"]|"")*)"/);
    return match ? match[1].replace(/""/g, '"') : '';
  }
  return trimmed.split(',')[0].trim();
}

/** Rough DNS label validation for domains (mirrors the backend). */
export function isValidDomain(value: string): boolean {
  const re =
    /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?!-)[a-z]{2,63}$/i;
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//i, '');
  if (!trimmed || trimmed.includes('/') || trimmed.includes('@')) return false;
  return re.test(trimmed) && trimmed.split('.').length >= 2;
}

/** Shuffles an array using a seeded PRNG (stable across renders). */
export function seededShuffle<T>(arr: T[], seed = 1): T[] {
  const out = [...arr];
  let s = seed;
  const rand = (): number => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
