'use client';

/** Lightweight toast notification stack. */
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <XCircle className="h-5 w-5 text-rose-500" />,
  info: <Info className="h-5 w-5 text-sky-500" />,
};

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex animate-fade-in items-start gap-3 rounded-xl border bg-white p-3 shadow-card-lg',
            'dark:bg-slate-900 dark:shadow-card-lg',
            t.kind === 'error'
              ? 'border-rose-200 dark:border-rose-900'
              : 'border-slate-200 dark:border-slate-800',
          )}
        >
          {icons[t.kind]}
          <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{t.message}</p>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
