'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Button, Skeleton } from '@/components/ui';
import { Header } from '@/components/Header';
import { DomainInput } from '@/components/DomainInput';
import { OptionsPanel } from '@/components/OptionsPanel';
import { GenerateSection } from '@/components/GenerateSection';
import { ResultsPanel } from '@/components/ResultsPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { ToastStack, type Toast } from '@/components/Toast';
import { useGenerator } from '@/hooks/useGenerator';
import { fetchHealth, API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';
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

  const checkHealth = useCallback(async () => {
    try {
      const h = await fetchHealth();
      setConnected(true);
      setWorkerCount(h.workers);
      return true;
    } catch {
      setConnected(false);
      return false;
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const isUsingLocalFallback = API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1');

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

      {connected === false ? (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <Card
            className={cn(
              'border-amber-300 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30',
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  Backend API not reachable
                </h2>
                <p className="text-sm text-amber-800/90 dark:text-amber-200/80">
                  The dashboard is talking to{' '}
                  <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                    {API_BASE}
                  </code>{' '}
                  and got no response.
                </p>
                {isUsingLocalFallback ? (
                  <p className="text-sm text-amber-800/90 dark:text-amber-200/80">
                    That&apos;s the local development default. On Vercel, add a{' '}
                    <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      NEXT_PUBLIC_API_URL
                    </code>{' '}
                    environment variable pointing to your deployed API (e.g.{' '}
                    <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      https://your-api.vercel.app/api
                    </code>
                    ), then re-deploy. See docs/DEPLOYMENT.md.
                  </p>
                ) : (
                  <p className="text-sm text-amber-800/90 dark:text-amber-200/80">
                    Check that the API is deployed and that this URL is correct, then retry.
                  </p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => void checkHealth()}>
                Retry
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

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
