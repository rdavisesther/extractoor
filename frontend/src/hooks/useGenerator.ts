'use client';

/**
 * Central state hook for the Subdomain Generator dashboard.
 * Owns input, options, generation lifecycle, progress animation and history.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearHistory,
  deleteHistoryRecord,
  fetchHistory,
  generateSubdomains as apiGenerate,
} from '@/lib/api';
import type {
  Category,
  GenerateResponse,
  HistoryRecord,
  OutputFormat,
  PatternConfig,
} from '@/types';

export const COUNT_OPTIONS = [100, 250, 500, 1000, 2000, 5000, 10000] as const;
export const MAX_COUNT = 10000;

type Status = 'idle' | 'generating' | 'success' | 'error';

export interface Stats {
  total: number;
  unique: number;
  duplicatesRemoved: number;
  generationTimeMs: number;
}

const EMPTY_PATTERN: PatternConfig = {
  enabled: false,
  bases: 'mail\nmx\nsmtp'.split('\n'),
  start: 1,
  digits: 2,
  direction: 'asc',
};

/** Rough client-side estimate of generation time for the progress bar. */
export function estimateTimeMs(count: number): number {
  return Math.min(400 + count * 0.15, 8000);
}

export function useGenerator() {
  const [domains, setDomains] = useState<string[]>(['example.com']);
  const [singleDomain, setSingleDomain] = useState('example.com');
  const [bulkText, setBulkText] = useState('');
  const [domainMode, setDomainMode] = useState<'single' | 'bulk'>('single');

  const [count, setCount] = useState<number>(500);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customPrefixes, setCustomPrefixes] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [randomMode, setRandomMode] = useState(false);
  const [pattern, setPattern] = useState<PatternConfig>(EMPTY_PATTERN);
  const [format, setFormat] = useState<OutputFormat>('subdomain');

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | undefined>();
  const [results, setResults] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [historyId, setHistoryId] = useState<number | undefined>();
  const [generatedDomains, setGeneratedDomains] = useState<string[]>([]);

  const [progress, setProgress] = useState(0);
  const [progressDetail, setProgressDetail] = useState<{ current: number; etaMs: number }>({
    current: 0,
    etaMs: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetchHistory(30, 0);
      setHistory(res.items);
      setHistoryTotal(res.total);
    } catch {
      setHistory([]);
      setHistoryTotal(0);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const runGenerate = useCallback(async () => {
    stopTimer();

    const activeDomains =
      domainMode === 'single' ? [singleDomain.trim().toLowerCase()] : domains;

    if (activeDomains.length === 0) {
      setStatus('error');
      setError('Enter at least one domain.');
      return;
    }

    setStatus('generating');
    setError(undefined);
    setProgress(0);

    const estimate = estimateTimeMs(count);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(94, Math.round((elapsed / estimate) * 94));
      setProgress(next);
      setProgressDetail({
        current: Math.min(count, Math.round((count * next) / 100)),
        etaMs: Math.max(0, estimate - elapsed),
      });
    }, 120);

    try {
      const payload = {
        domains: activeDomains,
        count,
        categories,
        customPrefixes: customPrefixes
          .split(/\r?\n|,/)
          .map((p) => p.trim())
          .filter(Boolean),
        pattern,
        randomMode,
        aiMode,
        format,
        requestId: `web-${Date.now()}`,
      };
      const res: GenerateResponse = await apiGenerate(payload);
      setResults(res.results);
      setStats({
        total: res.total,
        unique: res.unique,
        duplicatesRemoved: res.duplicatesRemoved,
        generationTimeMs: res.generationTimeMs,
      });
      setHistoryId(res.historyId);
      setGeneratedDomains(activeDomains);
      setStatus('success');
      setProgress(100);
      void refreshHistory();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Generation failed.');
      setResults([]);
      setStats(null);
    } finally {
      stopTimer();
    }
  }, [
    stopTimer,
    domainMode,
    singleDomain,
    domains,
    count,
    categories,
    customPrefixes,
    pattern,
    randomMode,
    aiMode,
    format,
    refreshHistory,
  ]);

  const handleDeleteHistory = useCallback(
    async (id: number) => {
      try {
        await deleteHistoryRecord(id);
      } catch {
        // non-fatal
      }
      void refreshHistory();
    },
    [refreshHistory],
  );

  const handleClearHistory = useCallback(async () => {
    try {
      await clearHistory();
    } catch {
      // non-fatal
    }
    void refreshHistory();
  }, [refreshHistory]);

  const toggleCategory = useCallback((cat: Category) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }, []);

  const setAllCategories = useCallback((cats: Category[]) => setCategories(cats), []);

  return {
    // input
    domains,
    setDomains,
    singleDomain,
    setSingleDomain,
    bulkText,
    setBulkText,
    domainMode,
    setDomainMode,
    // options
    count,
    setCount,
    categories,
    toggleCategory,
    setAllCategories,
    customPrefixes,
    setCustomPrefixes,
    aiMode,
    setAiMode,
    randomMode,
    setRandomMode,
    pattern,
    setPattern,
    format,
    setFormat,
    // lifecycle
    status,
    setStatus,
    error,
    results,
    setResults,
    stats,
    setStats,
    historyId,
    setHistoryId,
    generatedDomains,
    setGeneratedDomains,
    progress,
    progressDetail,
    runGenerate,
    // history
    history,
    historyTotal,
    refreshHistory,
    handleDeleteHistory,
    handleClearHistory,
  };
}

export type Generator = ReturnType<typeof useGenerator>;
