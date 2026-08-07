'use client';

/** Generate button with live progress bar (percentage, count, ETA). */
import { Loader2, Play, Zap } from 'lucide-react';
import type { Generator } from '@/hooks/useGenerator';
import { cn, formatDuration, formatNumber } from '@/lib/utils';
import { Button } from './ui';

export function GenerateSection({ g }: { g: Generator }) {
  const generating = g.status === 'generating';
  const disabled = generating || g.domains.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button size="md" className="min-w-[160px]" onClick={() => void g.runGenerate()} disabled={disabled}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {generating ? 'Generating…' : 'Generate'}
            </Button>
            <span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex dark:text-slate-500">
              <Zap className="h-3.5 w-3.5 text-primary-500" />
              Worker-thread accelerated
            </span>
          </div>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200">{formatNumber(g.count)}</span> subdomains
          {g.domains.length > 1 ? (
            <>
              {' '}for <span className="font-semibold text-slate-700 dark:text-slate-200">{g.domains.length}</span> domains
            </>
          ) : null}
        </div>
      </div>

      {generating ? (
        <div className="animate-fade-in">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Generating {formatNumber(g.progressDetail.current)} of {formatNumber(g.count)}
            </span>
            <span className="font-medium text-primary-600 dark:text-primary-400">{Math.round(g.progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-150"
              style={{ width: `${Math.max(2, g.progress)}%` }}
            />
          </div>
          <p className={cn('mt-1.5 text-xs text-slate-400 dark:text-slate-500')}>
            Estimated time remaining: {formatDuration(g.progressDetail.etaMs)}
          </p>
        </div>
      ) : null}

      {g.status === 'error' ? (
        <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
          {g.error}
        </div>
      ) : null}
    </div>
  );
}
