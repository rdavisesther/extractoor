'use client';

import { useState, useCallback, useRef } from 'react';
import { apiPost, apiPostSSE } from '@/lib/api';
import { EmailData, ExtractField } from '@/types/email';

interface ExtractionState {
  email: string;
  password: string;
  host: string;
  port: string;

  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
  connectionError: string;
  connectionProvider: string;

  folders: string[];
  foldersLoading: boolean;

  selectedFolders: string[];
  startFrom: number;
  count: number;
  selectedFields: ExtractField[];

  extracting: boolean;
  extractPhase: string;
  currentFolder: string;
  processed: number;
  total: number;
  found: number;
  skipped: number;
  errors: number;

  results: EmailData[];
  selectedRows: Set<number>;

  lastError: string;
}

const INITIAL_STATE: ExtractionState = {
  email: '',
  password: '',
  host: '',
  port: '',

  connectionStatus: 'idle',
  connectionError: '',
  connectionProvider: '',

  folders: [],
  foldersLoading: false,

  selectedFolders: ['INBOX'],
  startFrom: 1,
  count: 50,
  selectedFields: ['fromName', 'fromEmail', 'to', 'subject', 'date'] as ExtractField[],

  extracting: false,
  extractPhase: '',
  currentFolder: '',
  processed: 0,
  total: 0,
  found: 0,
  skipped: 0,
  errors: 0,

  results: [],
  selectedRows: new Set<number>(),

  lastError: '',
};

export function useEmailExtraction() {
  const [state, setState] = useState<ExtractionState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const update = useCallback((patch: Partial<ExtractionState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const testConnection = useCallback(async () => {
    if (!state.email || !state.password) {
      update({ connectionStatus: 'error', connectionError: 'Email and password are required.' });
      return;
    }
    update({ connectionStatus: 'testing', connectionError: '', foldersLoading: true });
    try {
      const result = await apiPost<{ success: boolean; provider: string; error?: string }>(
        '/api/email/test-connection',
        {
          email: state.email,
          password: state.password,
          host: state.host || undefined,
          port: state.port ? Number(state.port) : undefined,
        },
      );
      if (result.success) {
        update({ connectionStatus: 'success', connectionProvider: result.provider, connectionError: '' });
        const foldersResult = await apiPost<{ success: boolean; folders: { name: string; path: string; delimiter: string; flags: string[] }[] }>(
          '/api/email/folders',
          {
            email: state.email,
            password: state.password,
            host: state.host || undefined,
            port: state.port ? Number(state.port) : undefined,
          },
        );
        const folderNames = foldersResult.folders.map((f) => f.path);
        update({ folders: folderNames, foldersLoading: false });
      } else {
        update({
          connectionStatus: 'error',
          connectionError: result.error ?? 'Connection failed.',
          foldersLoading: false,
          folders: [],
        });
      }
    } catch (err) {
      update({
        connectionStatus: 'error',
        connectionError: err instanceof Error ? err.message : 'Connection failed.',
        foldersLoading: false,
      });
    }
  }, [state.email, state.password, state.host, state.port, update]);

  const startExtraction = useCallback(async () => {
    if (state.selectedFolders.length === 0 || state.selectedFields.length === 0) {
      update({ lastError: 'Please select at least one folder and one field.' });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    update({
      extracting: true,
      extractPhase: 'connecting',
      currentFolder: '',
      processed: 0,
      total: 0,
      found: 0,
      skipped: 0,
      errors: 0,
      results: [],
      selectedRows: new Set(),
      lastError: '',
    });

    try {
      await apiPostSSE(
        '/api/email/extract',
        {
          email: state.email,
          password: state.password,
          host: state.host || undefined,
          port: state.port ? Number(state.port) : undefined,
          folders: state.selectedFolders,
          startFrom: state.startFrom,
          count: state.count,
          fields: state.selectedFields,
        },
        (event) => {
          if (event.type === 'row') {
            const row = event.row as EmailData;
            setState((prev) => ({ ...prev, results: [...prev.results, row] }));
          } else if (event.type === 'progress') {
            update({
              extractPhase: String(event.phase ?? ''),
              currentFolder: String(event.currentFolder ?? ''),
              processed: Number(event.processed ?? 0),
              total: Number(event.total ?? 0),
              found: Number(event.found ?? 0),
              skipped: Number(event.skipped ?? 0),
              errors: Number(event.errors ?? 0),
            });
          } else if (event.type === 'complete') {
            update({
              extractPhase: 'complete',
              extracting: false,
              processed: Number(event.processed ?? 0),
              total: Number(event.total ?? 0),
              found: Number(event.found ?? 0),
            });
          } else if (event.type === 'error') {
            update({
              lastError: String(event.error ?? 'Extraction failed.'),
              extracting: false,
            });
          }
        },
        controller.signal,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        update({ extracting: false });
      } else {
        update({
          lastError: err instanceof Error ? err.message : 'Extraction failed.',
          extracting: false,
        });
      }
    } finally {
      abortRef.current = null;
    }
  }, [state.email, state.password, state.host, state.port, state.selectedFolders, state.startFrom, state.count, state.selectedFields, update]);

  const cancelExtraction = useCallback(() => {
    abortRef.current?.abort();
    update({ extracting: false });
  }, [update]);

  const toggleRow = useCallback((uid: number) => {
    setState((prev) => {
      const next = new Set(prev.selectedRows);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return { ...prev, selectedRows: next };
    });
  }, []);

  const setSelectedRows = useCallback((rows: Set<number>) => {
    setState((prev) => ({ ...prev, selectedRows: rows }));
  }, []);

  return {
    state,
    update,
    testConnection,
    startExtraction,
    cancelExtraction,
    toggleRow,
    setSelectedRows,
  };
}
