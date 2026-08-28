'use client';

import { Progress } from '@/components/ui/Progress';
import { X } from 'lucide-react';

interface ProgressOverlayProps {
  visible: boolean;
  phase: string;
  currentFolder: string;
  processed: number;
  total: number;
  found: number;
  skipped: number;
  errors: number;
  onCancel: () => void;
}

export function ProgressOverlay({
  visible, phase, currentFolder, processed, total, found, skipped, errors, onCancel,
}: ProgressOverlayProps) {
  if (!visible) return null;

  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const displayTotal = total > 0 ? total : '...';

  return (
    <div className="card p-5 animate-fade-in border-brand-200 bg-brand-50/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse-dot" />
          <h3 className="text-sm font-semibold text-gray-900">
            {phase === 'connecting' && 'Connecting to mailbox...'}
            {phase === 'listing' && 'Loading folders...'}
            {phase === 'extracting' && 'Extracting emails...'}
            {phase === 'complete' && 'Extraction complete'}
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Progress value={pct} size="md" />

      <div className="mt-3 grid grid-cols-5 gap-3 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-900">{pct}%</p>
          <p className="text-[10px] text-gray-500">Progress</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-brand-600">{processed} / {displayTotal}</p>
          <p className="text-[10px] text-gray-500">Processed</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-emerald-600">{found}</p>
          <p className="text-[10px] text-gray-500">Found</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-600">{skipped}</p>
          <p className="text-[10px] text-gray-500">Skipped</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-red-600">{errors}</p>
          <p className="text-[10px] text-gray-500">Errors</p>
        </div>
      </div>

      {currentFolder && (
        <p className="mt-2 text-xs text-gray-500 text-center">
          Current folder: <span className="font-medium text-gray-700">{currentFolder}</span>
        </p>
      )}
    </div>
  );
}
