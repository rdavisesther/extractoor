'use client';

import { Globe2, ServerCog } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Header({ connected, workerCount }: { connected: boolean; workerCount: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-500/30">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
              Bulk Subdomain Generator
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {connected ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  API online · {workerCount} worker threads · 38k+ prefixes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <ServerCog className="h-3 w-3" />
                  API unreachable — start the backend (see README)
                </span>
              )}
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
