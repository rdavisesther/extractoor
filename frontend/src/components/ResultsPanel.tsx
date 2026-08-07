'use client';

/** Results: statistics, search/filter/sort toolbar, virtualized list, downloads. */
import { useMemo, useRef, useState } from 'react';
import {
  CheckCheck,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Files,
  ListFilter,
  Search,
  Timer,
  Layers,
} from 'lucide-react';
import type { Generator } from '@/hooks/useGenerator';
import type { SortMode } from '@/types';
import { downloadCsv, downloadJson, downloadTxt, downloadXlsx, copyAll } from '@/lib/download';
import { cn, formatDuration, formatNumber, seededShuffle } from '@/lib/utils';
import { Badge, Button, Card, Input, Select, Skeleton, StatCard } from './ui';

const ROW_HEIGHT = 30;

type FilterMode = 'contains' | 'starts' | 'ends';

interface ResultRowProps {
  index: number;
  value: string;
}

export function ResultsPanel({ g, notify }: { g: Generator; notify: (kind: 'success' | 'error' | 'info', msg: string) => void }) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('contains');
  const [minLen, setMinLen] = useState('');
  const [maxLen, setMaxLen] = useState('');
  const [sort, setSort] = useState<SortMode>('alphabetical');
  const [copied, setCopied] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let out = g.results;

    if (needle) {
      out = out.filter((item) => {
        const lc = item.toLowerCase();
        if (filterMode === 'starts') return lc.startsWith(needle);
        if (filterMode === 'ends') return lc.endsWith(needle);
        return lc.includes(needle);
      });
    }

    const min = Number(minLen);
    const max = Number(maxLen);
    if (Number.isFinite(min) && min > 0) out = out.filter((i) => i.length >= min);
    if (Number.isFinite(max) && max > 0) out = out.filter((i) => i.length <= max);

    if (sort === 'alphabetical') out = [...out].sort((a, b) => a.localeCompare(b));
    else if (sort === 'reverse') out = [...out].sort((a, b) => b.localeCompare(a));
    else if (sort === 'length') out = [...out].sort((a, b) => a.length - b.length || a.localeCompare(b));
    else if (sort === 'random') out = seededShuffle(out, g.historyId ?? 1);

    return out;
  }, [g.results, search, filterMode, minLen, maxLen, sort, g.historyId]);

  const handleScroll = (): void => {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setViewportH(el.clientHeight);
  };

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 10);
  const visibleCount = Math.ceil(viewportH / ROW_HEIGHT) + 20;
  const endIndex = Math.min(filtered.length, startIndex + visibleCount);
  const window = filtered.slice(startIndex, endIndex);

  const handleCopy = async (): Promise<void> => {
    try {
      await copyAll(g.results);
      setCopied(true);
      notify('success', `Copied ${formatNumber(g.results.length)} subdomains to clipboard.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('error', 'Clipboard unavailable in this browser.');
    }
  };

  const handleXlsx = async (): Promise<void> => {
    if (!g.historyId) {
      notify('info', 'Generate first to create a downloadable record.');
      return;
    }
    setDownloadingXlsx(true);
    try {
      await downloadXlsx(g.historyId);
      notify('success', 'Excel (.xlsx) exported.');
    } catch {
      notify('error', 'Excel export failed.');
    } finally {
      setDownloadingXlsx(false);
    }
  };

  if (g.status === 'idle' || (g.status === 'error' && g.results.length === 0)) {
    return (
      <Card className="p-5">
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Layers className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {g.status === 'error' ? 'Generation failed — check the message above.' : 'Generated subdomains will appear here.'}
          </p>
          {g.status === 'idle' ? (
            <div className="mt-2 w-full max-w-sm space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : null}
        </div>
      </Card>
    );
  }

  const formatLabel =
    g.format === 'https' ? 'https://…' : g.format === 'http' ? 'http://…' : 'sub.domain.com';

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={formatNumber(g.stats?.total ?? 0)} icon={<Files className="h-4 w-4" />} />
        <StatCard label="Unique" value={formatNumber(g.stats?.unique ?? 0)} icon={<CheckCheck className="h-4 w-4" />} />
        <StatCard label="Duplicates" value={formatNumber(g.stats?.duplicatesRemoved ?? 0)} icon={<ListFilter className="h-4 w-4" />} />
        <StatCard label="Time" value={formatDuration(g.stats?.generationTimeMs ?? 0)} icon={<Timer className="h-4 w-4" />} />
      </div>

      {/* Downloads */}
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Badge className="mr-1">{g.format === 'subdomain' ? formatLabel : formatLabel}</Badge>
        <Button variant="secondary" size="sm" onClick={() => { downloadTxt(filtered); notify('success', 'TXT downloaded.'); }}>
          <FileText className="h-4 w-4" /> TXT
        </Button>
        <Button variant="secondary" size="sm" onClick={() => { downloadCsv(filtered); notify('success', 'CSV downloaded.'); }}>
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button variant="secondary" size="sm" onClick={() => { downloadJson(filtered); notify('success', 'JSON downloaded.'); }}>
          <Files className="h-4 w-4" /> JSON
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void handleXlsx()} disabled={downloadingXlsx}>
          <FileSpreadsheet className="h-4 w-4" /> {downloadingXlsx ? '…' : 'Excel'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void handleCopy()}>
          {copied ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />} Copy All
        </Button>
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
          Showing {formatNumber(filtered.length)} of {formatNumber(g.results.length)}
        </span>
      </Card>

      {/* Search / filter / sort toolbar */}
      <Card className="space-y-3 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search generated subdomains…"
              className="pl-9"
            />
          </div>
          <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value as FilterMode)} className="w-36">
            <option value="contains">Contains</option>
            <option value="starts">Starts with</option>
            <option value="ends">Ends with</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="w-40">
            <option value="alphabetical">Sort: A–Z</option>
            <option value="reverse">Sort: Z–A</option>
            <option value="length">Sort: length</option>
            <option value="random">Sort: random</option>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            Min length
            <Input type="number" min={0} value={minLen} onChange={(e) => setMinLen(e.target.value)} className="w-20" />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            Max length
            <Input type="number" min={0} value={maxLen} onChange={(e) => setMaxLen(e.target.value)} className="w-20" />
          </label>
          {(minLen || maxLen) ? (
            <button
              onClick={() => { setMinLen(''); setMaxLen(''); }}
              className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              Clear length
            </button>
          ) : null}
        </div>
      </Card>

      {/* Virtualized list */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Results
          </span>
          <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{g.format}</span>
        </div>
        <div ref={scrollerRef} onScroll={handleScroll} className="scroll-thin h-[420px] overflow-y-auto">
          <div style={{ height: filtered.length * ROW_HEIGHT, position: 'relative' }}>
            {window.map((value, i) => (
              <div
                key={startIndex + i}
                style={{ height: ROW_HEIGHT, position: 'absolute', top: (startIndex + i) * ROW_HEIGHT, left: 0, right: 0 }}
                className={cn(
                  'flex items-center px-4 font-mono text-sm transition-colors',
                  (startIndex + i) % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/60 dark:bg-slate-800/40',
                )}
              >
                <span className="mr-3 w-14 shrink-0 text-right text-xs tabular-nums text-slate-400">
                  {startIndex + i + 1}
                </span>
                <span className="truncate text-slate-800 dark:text-slate-200">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export type { ResultRowProps };
