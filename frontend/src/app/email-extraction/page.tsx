'use client';

import { Header } from '@/components/Header';
import { MailboxSection } from '@/components/email/MailboxSection';
import { RangeSection } from '@/components/email/RangeSection';
import { CategorySection } from '@/components/email/CategorySection';
import { FieldSection, DEFAULT_FIELDS } from '@/components/email/FieldSection';
import { ResultsTable } from '@/components/email/ResultsTable';
import { StatsBar } from '@/components/email/StatsBar';
import { ExportPanel } from '@/components/email/ExportPanel';
import { ProgressOverlay } from '@/components/email/ProgressOverlay';
import { Button } from '@/components/ui/Button';
import { useEmailExtraction } from '@/hooks/useEmailExtraction';
import { apiPostBlob } from '@/lib/api';
import type { EmailData } from '@/types/email';
import { computeDuplicates } from '@/lib/utils';
import { Zap, RotateCcw } from 'lucide-react';

export default function EmailExtractionPage() {
  const {
    state,
    update,
    testConnection,
    startExtraction,
    cancelExtraction,
    setSelectedRows,
  } = useEmailExtraction();

  const isReady = state.email.trim() !== '' && state.password !== '' && state.selectedFolders.length > 0 && state.selectedFields.length > 0;

  const exportRows = async (rows: EmailData[], format: 'csv' | 'txt' | 'json') => {
    if (rows.length === 0) return;
    try {
      const blob = await apiPostBlob('/api/email/export', {
        data: rows,
        fields: state.selectedFields,
        format,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mailcmh-export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const duplicates = computeDuplicates(state.results, (row) => `${row.fromEmail ?? ''}|${row.subject ?? ''}`.toLowerCase()).size;

  const dedupeResults = () => {
    const seen = new Set<string>();
    const deduped = state.results.filter((row) => {
      const key = `${row.fromEmail ?? ''}|${row.subject ?? ''}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    update({ results: deduped, selectedRows: new Set() });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Header
        title="Email Extraction"
        description="Extract emails from any IMAP mailbox with full control over fields and folders."
      />

      <ProgressOverlay
        visible={state.extracting}
        phase={state.extractPhase}
        currentFolder={state.currentFolder}
        processed={state.processed}
        total={state.total}
        found={state.found}
        skipped={state.skipped}
        errors={state.errors}
        onCancel={cancelExtraction}
      />

      {state.lastError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in">
          {state.lastError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <MailboxSection
            email={state.email}
            setEmail={(v) => update({ email: v })}
            password={state.password}
            setPassword={(v) => update({ password: v })}
            host={state.host}
            setHost={(v) => update({ host: v })}
            port={state.port}
            setPort={(v) => update({ port: v })}
            connectionStatus={state.connectionStatus}
            connectionError={state.connectionError}
            connectionProvider={state.connectionProvider}
            onTestConnection={testConnection}
          />

          <RangeSection
            startFrom={state.startFrom}
            setStartFrom={(v) => update({ startFrom: v })}
            count={state.count}
            setCount={(v) => update({ count: v })}
          />
        </div>

        <div className="space-y-5">
          <CategorySection
            categories={state.folders}
            selectedCategories={state.selectedFolders}
            setSelectedCategories={(v) => update({ selectedFolders: v })}
            loading={state.foldersLoading}
          />

          <FieldSection
            selectedFields={state.selectedFields}
            setSelectedFields={(v) => update({ selectedFields: v as any })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={startExtraction}
          loading={state.extracting}
          disabled={!isReady || state.extracting}
          icon={<Zap className="h-4 w-4" />}
          size="lg"
        >
          Extract Emails
        </Button>
        {state.results.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => update({ results: [], selectedRows: new Set(), found: 0, processed: 0, errors: 0, skipped: 0 })}
            icon={<RotateCcw className="h-4 w-4" />}
          >
            Clear Results
          </Button>
        )}
      </div>

      {state.results.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <StatsBar
            found={state.results.length}
            processed={state.processed}
            duplicates={duplicates}
            errors={state.errors}
            selected={state.selectedRows.size}
          />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <ExportPanel
              data={state.results}
              fields={state.selectedFields}
              disabled={state.results.length === 0}
            />
            {duplicates > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={dedupeResults}
                className="text-xs"
              >
                Remove {duplicates} duplicates
              </Button>
            )}
          </div>

          <ResultsTable
            data={state.results}
            fields={state.selectedFields}
            selectedRows={state.selectedRows}
            setSelectedRows={setSelectedRows}
            onExportRows={exportRows}
          />
        </div>
      )}
    </div>
  );
}
