/**
 * Client-side download helpers.
 * TXT/CSV/JSON are generated locally; XLSX is produced by the backend.
 */
import { fetchExport } from './api';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toBlob(text: string, mime: string): Blob {
  return new Blob([text], { type: mime });
}

export function downloadTxt(results: string[], filename = 'subdomains.txt'): void {
  triggerDownload(toBlob(`${results.join('\n')}\n`, 'text/plain;charset=utf-8'), filename);
}

export function downloadCsv(results: string[], filename = 'subdomains.csv'): void {
  const escape = (v: string): string => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const content = `subdomain\n${results.map(escape).join('\n')}\n`;
  triggerDownload(toBlob(content, 'text/csv;charset=utf-8'), filename);
}

export function downloadJson(results: string[], meta?: Record<string, unknown>, filename = 'subdomains.json'): void {
  const content = JSON.stringify({ success: true, total: results.length, ...(meta ?? {}), results }, null, 2);
  triggerDownload(toBlob(content, 'application/json;charset=utf-8'), filename);
}

/** Downloads the XLSX export from the backend for a saved history record. */
export async function downloadXlsx(historyId: number): Promise<void> {
  const blob = await fetchExport(historyId, 'xlsx');
  triggerDownload(blob, 'subdomains.xlsx');
}

/** Copies all results to the clipboard. */
export async function copyAll(results: string[]): Promise<void> {
  await navigator.clipboard.writeText(results.join('\n'));
}
