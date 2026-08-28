'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RangeSectionProps {
  startFrom: number;
  setStartFrom: (v: number) => void;
  count: number;
  setCount: (v: number) => void;
  maxCount?: number;
}

const PRESETS = [10, 25, 50, 100, 250, 500];

export function RangeSection({ startFrom, setStartFrom, count, setCount, maxCount = 1000 }: RangeSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50">
            <Hash className="h-4 w-4 text-violet-600" />
          </div>
          <CardTitle>Email Range</CardTitle>
        </div>
      </CardHeader>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="label-text">Start From</label>
            <input
              type="number"
              min={1}
              value={startFrom}
              onChange={(e) => setStartFrom(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-field"
            />
            <p className="text-xs text-gray-500">Message index to start from</p>
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Number of Emails</label>
            <input
              type="number"
              min={1}
              max={maxCount}
              value={count}
              onChange={(e) => setCount(Math.min(maxCount, Math.max(1, parseInt(e.target.value) || 1)))}
              className="input-field"
            />
            <p className="text-xs text-gray-500">Max: {maxCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500">Quick presets</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setCount(Math.min(preset, maxCount))}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
                  count === preset
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
