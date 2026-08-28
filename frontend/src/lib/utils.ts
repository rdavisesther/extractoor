export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

export function computeDuplicates<T>(
  rows: T[],
  getKey: (row: T) => string | undefined,
): Set<number> {
  const seen = new Map<string, number>();
  const duplicates = new Set<number>();
  for (const row of rows) {
    const key = getKey(row);
    if (!key) continue;
    if (seen.has(key)) {
      duplicates.add(seen.get(key)!);
    } else {
      seen.set(key, 1);
    }
  }
  return duplicates;
}
