'use client';

/** Generation options: count, categories, custom prefixes, modes, format, patterns. */
import { Blocks, SlidersHorizontal, Sparkles, Shuffle, Wand2 } from 'lucide-react';
import { CATEGORIES, type Category, type PatternConfig } from '@/types';
import type { Generator } from '@/hooks/useGenerator';
import { Input, SectionTitle, Select, Textarea, Toggle } from './ui';
import { cn } from '@/lib/utils';
import { MAX_COUNT, COUNT_OPTIONS } from '@/hooks/useGenerator';

const CATEGORY_LABELS: Record<string, string> = {
  common: 'Common',
  business: 'Business',
  corporate: 'Corporate',
  security: 'Security',
  cloud: 'Cloud',
  hosting: 'Hosting',
  api: 'API',
  finance: 'Finance',
  insurance: 'Insurance',
  education: 'Education',
  medical: 'Medical',
  technology: 'Technology',
  government: 'Government',
  email: 'Email',
  marketing: 'Marketing',
  ecommerce: 'Ecommerce',
  streaming: 'Streaming',
  gaming: 'Gaming',
  ai: 'AI',
  crypto: 'Crypto',
  random: 'Random',
};

const MODE_CARDS: Array<{ key: 'aiMode' | 'randomMode'; label: string; desc: string; icon: React.ReactNode }> = [
  { key: 'aiMode', label: 'AI Smart', desc: 'Realistic, curated prefixes', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'randomMode', label: 'Random', desc: 'Readable creative prefixes', icon: <Shuffle className="h-4 w-4" /> },
];

export function OptionsPanel({ g }: { g: Generator }) {
  const p = g.pattern;
  const updatePattern = (patch: Partial<PatternConfig>): void => g.setPattern({ ...p, ...patch });

  return (
    <div className="space-y-6">
      <SectionTitle icon={<SlidersHorizontal className="h-4 w-4" />} title="Options" subtitle="Tune how subdomains are generated" />

      {/* Count */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Subdomains per run</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Up to 10,000 from the dashboard</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Select value={String(g.count)} onChange={(e) => g.setCount(Number(e.target.value))} className="w-36">
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()}
              </option>
            ))}
            <option value={MAX_COUNT}>10,000</option>
          </Select>
        </div>
      </div>

      {/* AI / Random mode cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODE_CARDS.map((card) => (
          <div
            key={card.key}
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
              g[card.key]
                ? 'border-primary-300 bg-primary-50/60 dark:border-primary-500/50 dark:bg-primary-500/10'
                : 'border-slate-200 dark:border-slate-700',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-primary-500 dark:text-primary-400">{card.icon}</div>
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{card.label}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{card.desc}</div>
              </div>
            </div>
            <Toggle checked={g[card.key]} onChange={(v) => g[card.key === 'aiMode' ? 'setAiMode' : 'setRandomMode'](v)} label={card.label} />
          </div>
        ))}
      </div>

      {/* Categories */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Categories</div>
          <button
            onClick={() => g.setAllCategories(g.categories.length === CATEGORIES.length ? [] : [...CATEGORIES])}
            className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {g.categories.length === CATEGORIES.length ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const active = g.categories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => g.toggleCategory(cat)}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-all',
                  active
                    ? 'border-primary-300 bg-primary-500/10 text-primary-700 dark:border-primary-500/60 dark:bg-primary-500/15 dark:text-primary-300'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400',
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {g.categories.length === 0
            ? 'No categories selected → uses the full dictionary.'
            : `${g.categories.length} selected.`}
        </p>
      </div>

      {/* Custom prefixes */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Custom prefixes <span className="font-normal text-slate-400">(one per line or comma-separated)</span>
        </label>
        <textarea
          value={g.customPrefixes}
          onChange={(e) => g.setCustomPrefixes(e.target.value)}
          rows={2}
          placeholder={'abc\ntest\nsupport'}
          className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Always included first, even if duplicates are removed.</p>
      </div>

      {/* Output format */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Output format</label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(
            [
              ['subdomain', 'sub.domain.com'],
              ['https', 'https://sub.domain.com'],
              ['http', 'http://sub.domain.com'],
            ] as const
          ).map(([value, sample]) => (
            <button
              key={value}
              onClick={() => g.setFormat(value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 font-mono text-xs transition-all',
                g.format === value
                  ? 'border-primary-400 bg-primary-500/10 text-primary-700 dark:border-primary-500/60 dark:text-primary-300'
                  : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400',
              )}
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Pattern generator */}
      <div className={cn('rounded-xl border p-3 transition-colors', p.enabled ? 'border-primary-300 bg-primary-50/40 dark:border-primary-500/40 dark:bg-primary-500/5' : 'border-slate-200 dark:border-slate-700')}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-primary-500 dark:text-primary-400">
              <Wand2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Pattern generator <Blocks className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                mail01, mail02… · use <code className="font-mono">server:3</code> for 3-digit padding
              </div>
            </div>
          </div>
          <Toggle checked={p.enabled} onChange={(v) => updatePattern({ enabled: v })} label="Pattern generator" />
        </div>

        {p.enabled ? (
          <div className="mt-3 space-y-3">
            <Textarea
              rows={3}
              value={p.bases.join('\n')}
              onChange={(e) => updatePattern({ bases: e.target.value.split(/\r?\n/) })}
              placeholder={'mail\nmx\nsmtp\nserver:3'}
              className="font-mono"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                Start
                <Input
                  type="number"
                  min={0}
                  value={p.start}
                  onChange={(e) => updatePattern({ start: Number(e.target.value) || 0 })}
                  className="w-20"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                Digits
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={p.digits}
                  onChange={(e) => updatePattern({ digits: Number(e.target.value) || 1 })}
                  className="w-20"
                />
              </label>
              <Select value={p.direction} onChange={(e) => updatePattern({ direction: e.target.value as 'asc' | 'desc' })} className="w-32">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </Select>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {p.bases
                .filter(Boolean)
                .slice(0, 3)
                .map((b) => `${b}${String(p.start).padStart(p.digits, '0')}`)
                .join(' · ')}{' '}
              …
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-primary-500" />
          Tip
        </div>
        Combine AI + categories + custom prefixes for the most realistic results.
      </div>
    </div>
  );
}
