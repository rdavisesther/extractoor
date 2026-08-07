'use client';

/** History: saved generations with reopen, re-download and delete. */
import { useState } from 'react';
import { Download, History, RefreshCw, Trash2, FolderOpen, ClipboardX } from 'lucide-react';
import type { Generator } from '@/hooks/useGenerator';
import type { HistoryRecord } from '@/types';
import { fetchHistoryRecord } from '@/lib/api';
import { downloadCsv, downloadJson, downloadTxt, downloadXlsx } from '@/lib/download';
import { cn, formatDate, formatDuration, formatNumber } from '@/lib/utils';
import { Button, Card, SectionTitle, Skeleton } from './ui';

export function HistoryPanel({
  g,
  onOpen,
  notify,
}: {
  g: Generator;
  onOpen: (record: HistoryRecord) => void;
  notify: (kind: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [opening, setOpening] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const handleOpen = async (id: number): Promise<void> => {
    setOpening(id);
    try {
      const res = await fetchHistoryRecord(id);
      onOpen(res.record);
      notify('success', `Reopened run #${id} (${formatNumber(res.record.results.length)} subdomains).`);
    } catch {
      notify('error', 'Could not load that history record.');
    } finally {
      setOpening(null);
    }
  };

  const handleDownload = async (id: number, format: 'txt' | 'csv' | 'json' | 'xlsx'): Promise<void> => {
    setBusy(id);
    try {
      if (format === 'xlsx') {
        await downloadXlsx(id);
      } else {
        const res = await fetchHistoryRecord(id);
        if (format === 'txt') downloadTxt(res.record.results, `subdomains-${id}.txt`);
        else if (format === 'csv') downloadCsv(res.record.results, `subdomains-${id}.csv`);
        else downloadJson(res.record.results, { source: 'history', id }, `subdomains-${id}.json`);
      }
      notify('success', `Run #${id} exported as ${format.toUpperCase()}.`);
    } catch {
      notify('error', 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <SectionTitle
          icon={<History className="h-4 w-4" />}
          title="History"
          subtitle={`${formatNumber(g.historyTotal)} saved generations`}
        />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void g.refreshHistory()} aria-label="Refresh history">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {g.history.length > 0 ? (
            <Button variant="danger" size="sm" onClick={() => void g.handleClearHistory()}>
              <ClipboardX className="h-4 w-4" /> Clear
            </Button>
          ) : null}
        </div>
      </div>

      {g.history.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
          No generations saved yet. Run the generator and it will appear here.
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {g.history.map((record) => (
            <div
              key={record.id}
              className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition-colors hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                    #{record.id} · {record.domains.slice(0, 2).join(', ')}
                    {record.domains.length > 2 ? ` +${record.domains.length - 2}` : ''}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300')}>
                    {record.format}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {formatNumber(record.results.length)} subdomains · {formatDuration(record.generationTimeMs)} · {formatDate(record.createdAt)}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => void handleOpen(record.id)} disabled={opening === record.id} title="Reopen">
                  {opening === record.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void handleDownload(record.id, 'txt')} disabled={busy === record.id} title="Download TXT">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void handleDownload(record.id, 'xlsx')} disabled={busy === record.id} title="Download XLSX">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void g.handleDeleteHistory(record.id)} title="Delete">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
