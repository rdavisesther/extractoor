/**
 * API client for the Subdomain Generator backend.
 * Uses NEXT_PUBLIC_API_URL (Vercel env) or the local backend default.
 */
import type { GenerateRequest, GenerateResponse, ApiError, HistoryRecord, HealthResponse } from '@/types';

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
).replace(/\/+$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    let body: ApiError | undefined;
    try {
      body = (await res.json()) as ApiError;
    } catch {
      body = undefined;
    }
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Generates subdomains on the backend (saved to history automatically). */
export async function generateSubdomains(payload: GenerateRequest): Promise<GenerateResponse> {
  return request<GenerateResponse>('/generate', { method: 'POST', body: JSON.stringify(payload) });
}

/** Lists generation history. */
export async function fetchHistory(limit = 20, offset = 0): Promise<{ items: HistoryRecord[]; total: number }> {
  return request<{ items: HistoryRecord[]; total: number }>(`/history?limit=${limit}&offset=${offset}`);
}

/** Fetches a single history record. */
export async function fetchHistoryRecord(id: number): Promise<{ record: HistoryRecord }> {
  return request<{ record: HistoryRecord }>(`/history/${id}`);
}

/** Deletes a history record. */
export async function deleteHistoryRecord(id: number): Promise<void> {
  await request(`/history/${id}`, { method: 'DELETE' });
}

/** Clears all history. */
export async function clearHistory(): Promise<void> {
  await request('/history', { method: 'DELETE' });
}

/** Fetches a file export (blob) for a history record. */
export async function fetchExport(id: number, format: 'txt' | 'csv' | 'json' | 'xlsx'): Promise<Blob> {
  const res = await fetch(`${API_BASE}/history/${id}/export?format=${format}`);
  if (!res.ok) throw new Error('Export failed.');
  return res.blob();
}

/** Fetches backend health (used to show connection status). */
export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}
