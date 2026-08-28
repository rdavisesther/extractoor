'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Download, FileText, FileJson, Table, FileSpreadsheet } from 'lucide-react';
import { apiPostBlob } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ExportPanelProps {
  data: Record<string, unknown>[];
  fields: string[];
  disabled?: boolean;
}

const FORMATS = [
  { id: 'csv', label: 'CSV', icon: FileText, mime: 'text/csv' },
  { id: 'json', label: 'JSON', icon: FileJson, mime: 'application/json' },
  { id: 'xlsx', label: 'XLSX', icon: FileSpreadsheet, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { id: 'txt', label: 'TXT', icon: Table, mime: 'text/plain' },
] as const;

export function ExportPanel({ data, fields, disabled }: ExportPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    if (data.length === 0) return;
    setExporting(format);
    try {
      const blob = await apiPostBlob('/api/email/export', { data, fields, format });
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
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Download className="h-4 w-4 text-gray-400" />
      <span className="text-xs font-medium text-gray-500 mr-1">Export:</span>
      {FORMATS.map((fmt) => (
        <Button
          key={fmt.id}
          variant="secondary"
          size="sm"
          disabled={disabled || data.length === 0}
          loading={exporting === fmt.id}
          onClick={() => handleExport(fmt.id)}
          icon={<fmt.icon className="h-3.5 w-3.5" />}
          className="text-xs py-1.5"
        >
          {fmt.label}
        </Button>
      ))}
    </div>
  );
}
