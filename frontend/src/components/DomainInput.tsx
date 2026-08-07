'use client';

/** Domain input: single / bulk / file upload (TXT & CSV). */
import { useRef, useState } from 'react';
import { FileUp, Globe, List, Upload } from 'lucide-react';
import { Button, Input, SectionTitle, Textarea } from './ui';
import { cn, firstCsvColumn, isValidDomain, parseDomainLines } from '@/lib/utils';
import type { Generator } from '@/hooks/useGenerator';

type Tab = 'single' | 'bulk';

export function DomainInput({ g }: { g: Generator }) {
  const [tab, setTab] = useState<Tab>(g.domainMode);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | undefined>();

  const switchTab = (next: Tab): void => {
    setTab(next);
    g.setDomainMode(next);
    setFileError(undefined);
  };

  const importLines = (lines: string[]): void => {
    const parsed = parseDomainLines(lines.join('\n'));
    const valid = parsed.filter(isValidDomain);
    const invalid = parsed.length - valid.length;
    if (valid.length === 0) {
      setFileError('No valid domains found in the file.');
      return;
    }
    const merged = parseDomainLines([...g.domains, ...valid].join('\n'));
    g.setDomains(merged);
    g.setBulkText(merged.join('\n'));
    setFileError(invalid > 0 ? `Imported ${valid.length} domains; skipped ${invalid} invalid line(s).` : undefined);
    switchTab('bulk');
  };

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const text = await file.text();
    const ext = file.name.toLowerCase().split('.').pop();
    const lines = text
      .split(/\r?\n/)
      .map((line) => (ext === 'csv' ? firstCsvColumn(line) : line.trim()));
    importLines(lines);
  };

  return (
    <div>
      <SectionTitle icon={<Globe className="h-4 w-4" />} title="Domains" subtitle="Single, bulk, or upload a file" />

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {(['single', 'bulk'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              tab === t
                ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400',
            )}
          >
            {t === 'single' ? <Globe className="h-4 w-4" /> : <List className="h-4 w-4" />}
            {t === 'single' ? 'Single' : 'Bulk'}
          </button>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-all hover:text-slate-700 dark:text-slate-400"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".txt,.csv,text/plain,text/csv"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {tab === 'single' ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={g.singleDomain}
            onChange={(e) => {
              g.setSingleDomain(e.target.value);
              g.setDomains([e.target.value.trim().toLowerCase()]);
            }}
            placeholder="example.com"
            spellCheck={false}
            autoCapitalize="none"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const v = g.singleDomain.trim().toLowerCase();
              if (!isValidDomain(v)) {
                setFileError('That does not look like a valid domain.');
                return;
              }
              g.setDomains([v]);
              g.setBulkText(v);
              setFileError(undefined);
            }}
          >
            Apply
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'rounded-xl border-2 border-dashed transition-colors',
            dragOver
              ? 'border-primary-400 bg-primary-50/60 dark:bg-primary-500/10'
              : 'border-slate-200 dark:border-slate-700',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <Textarea
            rows={5}
            value={g.bulkText}
            onChange={(e) => {
              g.setBulkText(e.target.value);
              g.setDomains(parseDomainLines(e.target.value));
            }}
            placeholder={'example.com\ngoogle.com\napple.com'}
            spellCheck={false}
          />
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <FileUp className="h-3.5 w-3.5" />
              Drop a .txt or .csv here — CSV reads the first column
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {g.domains.length} valid
            </span>
          </div>
        </div>
      )}

      {fileError ? <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{fileError}</p> : null}
    </div>
  );
}
