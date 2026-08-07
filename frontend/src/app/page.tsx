'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Skeleton } from '@/components/ui';
import { Header } from '@/components/Header';
import { DomainInput } from '@/components/DomainInput';
import { OptionsPanel } from '@/components/OptionsPanel';
import { GenerateSection } from '@/components/GenerateSection';
import { ResultsPanel } from '@/components/ResultsPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { ToastStack, type Toast } from '@/components/Toast';
import { useGenerator } from '@/hooks/useGenerator';
import { fetchHealth } from '@/lib/api';
import type { HistoryRecord } from '@/types';

export default function Dashboard() {
  const g = useGenerator();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [workerCount, setWorkerCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }].slice(-4));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    void fetchHealth()
      .then((h) => {
        setConnected(true);
        setWorkerCount(h.workers);
      })
      .catch(() => setConnected(false));
  }, []);

  const handleOpenRecord = useCallback(
    (record: HistoryRecord) => {
      g.setResults(record.results);
      g.setStats({
        total: record.results.length,
        unique: record.unique,
        duplicatesRemoved: record.duplicatesRemoved,
        generationTimeMs: record.generationTimeMs,
      });
      g.setHistoryId(record.id);
      g.setGeneratedDomains(record.domains);
      g.setFormat(record.format);
      g.setStatus('success');
    },
    [g],
  );

  return (
    <div className="min-h-screen">
      <Header connected={connected === true} workerCount={workerCount} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left column: input + options */}
          <div className="space-y-6">
            {connected === null ? (
              <Card className="p-5">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            ) : (
              <Card className="p-5">
                <DomainInput g={g} />
              </Card>
            )}

            <Card className="p-5">
              <OptionsPanel g={g} />
            </Card>

            <Card className="p-5">
              <GenerateSection g={g} />
            </Card>
          </div>

          {/* Right column: results + history */}
          <div className="space-y-6">
            <ResultsPanel g={g} notify={notify} />
            <HistoryPanel g={g} onOpen={handleOpenRecord} notify={notify} />
          </div>
        </div>

        <footer className="mt-10 border-t border-slate-200/70 pb-6 pt-5 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          Bulk Subdomain Generator · Next.js + Express + SQLite · Worker-thread accelerated ·{' '}
          <span className="font-medium text-slate-500 dark:text-slate-400">Free &amp; open source</span>
        </footer>
      </main>
    </div>
  );
}
