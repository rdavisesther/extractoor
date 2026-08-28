'use client';

import { useState, useMemo } from 'react';
import { EmailData, ExtractField, FIELD_LABELS } from '@/types/email';
import { Badge } from '@/components/ui/Badge';
import { formatNumber, truncate, cn } from '@/lib/utils';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, CheckSquare, Square, Copy, Search,
  MoreHorizontal, Eye, CopyCheck, X,
} from 'lucide-react';

interface ResultsTableProps {
  data: EmailData[];
  fields: ExtractField[];
  selectedRows: Set<number>;
  setSelectedRows: (v: Set<number>) => void;
  onCopyEmails?: (emails: string[]) => void;
  onExportRows?: (rows: EmailData[], format: 'csv' | 'txt' | 'json') => void;
}

type SortConfig = { field: string; direction: 'asc' | 'desc' } | null;

const PAGE_SIZES = [25, 50, 100, 250];
const STATUS_OPTIONS = ['PASS', 'FAIL', 'NONE', 'ERROR', 'UNKNOWN'];

const BASE_COLUMNS = ['category', 'domain', 'spfStatus', 'dkimStatus', 'dmarcStatus', 'ip', 'origin'];

function getEmailAddress(email: EmailData): string {
  return email.fromEmail ?? '';
}

function getDomain(email: EmailData): string {
  const addr = getEmailAddress(email);
  return addr.split('@')[1] ?? '';
}

function statusBadge(status: string | undefined): string {
  if (!status) return '—';
  return status.toUpperCase();
}

function getFieldValue(email: EmailData, field: string): string {
  switch (field) {
    case 'category':
      return email.folder ?? '';
    case 'domain':
      return getDomain(email);
    case 'spfStatus':
    case 'dkimStatus':
    case 'dmarcStatus':
    case 'ip':
    case 'origin':
      return '';
    default:
      const val = email[field as ExtractField];
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) return val.map(String).join(', ');
      return String(val);
  }
}

export function ResultsTable({ data, fields, selectedRows, setSelectedRows, onCopyEmails, onExportRows }: ResultsTableProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortConfig>(null);
  const [openMenuUid, setOpenMenuUid] = useState<number | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);

  const dataFields = useMemo(
    () => fields.filter((f) => !BASE_COLUMNS.includes(f)),
    [fields],
  );

  const displayColumns = useMemo(() => {
    const cols = ['category', ...dataFields];
    if (fields.includes('fromEmail')) cols.push('domain');
    return cols;
  }, [dataFields, fields]);

  const filtered = useMemo(() => {
    let rows = data;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        (dataFields.length === 0
          ? [row.fromName, row.fromEmail, row.subject, row.folder]
          : dataFields.map((f) => getFieldValue(row, f))
        ).some((v) => v && String(v).toLowerCase().includes(q)),
      );
    }

    for (const [field, filterVal] of Object.entries(filters)) {
      if (!filterVal) continue;
      rows = rows.filter((row) => getFieldValue(row, field).toLowerCase() === filterVal.toLowerCase());
    }

    return rows;
  }, [data, search, filters, dataFields]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = getFieldValue(a, sort.field).toLowerCase();
      const bVal = getFieldValue(b, sort.field).toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const allOnPageSelected = paged.length > 0 && paged.every((r) => selectedRows.has(r.uid));
  const someOnPageSelected = paged.some((r) => selectedRows.has(r.uid));

  const toggleSort = (field: string) => {
    setSort((prev) => {
      if (prev?.field === field) {
        return prev.direction === 'asc' ? { field, direction: 'desc' } : null;
      }
      return { field, direction: 'asc' };
    });
  };

  const toggleRow = (uid: number) => {
    const next = new Set(selectedRows);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelectedRows(next);
  };

  const toggleAllOnPage = () => {
    const next = new Set(selectedRows);
    if (allOnPageSelected) paged.forEach((r) => next.delete(r.uid));
    else paged.forEach((r) => next.add(r.uid));
    setSelectedRows(next);
  };

  const selectedData = useMemo(
    () => data.filter((r) => selectedRows.has(r.uid)),
    [data, selectedRows],
  );

  const copyEmails = (rows: EmailData[]) => {
    const emails = rows.map(getEmailAddress).filter(Boolean);
    navigator.clipboard.writeText(emails.join('\n'));
    onCopyEmails?.(emails);
  };

  const copyField = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  const setGlobalFilter = (field: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[field] = value;
      else delete next[field];
      return next;
    });
    setPage(0);
  };

  const exportRows = (rows: EmailData[], format: 'csv' | 'txt' | 'json') => {
    onExportRows?.(rows, format);
  };

  if (data.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 mb-3">
          <span className="text-xl">✉</span>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">No extraction results</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Connect a mailbox and start an extraction.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-gray-100 px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails, names, subjects..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="input-field pl-8 py-1.5 text-xs w-56"
              />
            </div>
            <span className="text-xs text-gray-500">{formatNumber(sorted.length)} results</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </div>
        </div>

        {Object.keys(filters).length > 0 && (
          <div className="flex items-center gap-2 flex-wrap animate-fade-in">
            {Object.entries(filters).map(([field, value]) => (
              <span key={field} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700 ring-1 ring-inset ring-brand-600/20">
                {field}: {value}
                <button onClick={() => setGlobalFilter(field, '')} className="hover:text-brand-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button onClick={() => { setFilters({}); setPage(0); }} className="text-[11px] text-gray-500 hover:text-gray-700">
              Clear all
            </button>
          </div>
        )}
      </div>

      {selectedRows.size > 0 && (
        <div className="flex items-center justify-between border-b border-brand-100 bg-brand-50/50 px-3 py-2 animate-fade-in">
          <span className="text-xs font-medium text-brand-700">{selectedRows.size} selected</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => copyEmails(selectedData)} className="btn-ghost text-[11px] py-1 px-2">
              <Copy className="h-3 w-3" /> Copy Emails
            </button>
            <button onClick={() => exportRows(selectedData, 'csv')} className="btn-ghost text-[11px] py-1 px-2">
              CSV
            </button>
            <button onClick={() => exportRows(selectedData, 'json')} className="btn-ghost text-[11px] py-1 px-2">
              JSON
            </button>
            <button onClick={() => exportRows(selectedData, 'txt')} className="btn-ghost text-[11px] py-1 px-2">
              TXT
            </button>
            <button onClick={() => setSelectedRows(new Set())} className="btn-ghost text-[11px] py-1 px-2 text-red-600 hover:text-red-700">
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50/95">
              <th className="w-9 px-2 py-2">
                <button onClick={toggleAllOnPage} className="flex items-center justify-center">
                  {allOnPageSelected ? (
                    <CheckSquare className="h-4 w-4 text-brand-600" />
                  ) : someOnPageSelected ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded border-2 border-brand-600 bg-brand-600">
                      <span className="h-1.5 w-1.5 rounded-sm bg-white" />
                    </span>
                  ) : (
                    <Square className="h-4 w-4 text-gray-300" />
                  )}
                </button>
              </th>
              <th className="w-10 px-2 py-2 text-left text-[10px] font-medium text-gray-400">#</th>
              {displayColumns.map((field) => (
                <th
                  key={field}
                  className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                  onClick={() => toggleSort(field)}
                >
                  <span className="inline-flex items-center gap-1">
                    {FIELD_LABELS[field as ExtractField] ?? field.toUpperCase()}
                    {sort?.field === field ? (
                      sort.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
              <th className="w-12 px-2 py-2" />
            </tr>
            <tr className="border-b border-gray-100 bg-gray-50/95">
              <th className="px-2 py-1" />
              <th className="px-2 py-1" />
              {displayColumns.filter((f) => ['category', 'spfStatus', 'dkimStatus', 'dmarcStatus'].includes(f)).map((field) => (
                <th key={field} className="px-3 py-1.5">
                  <select
                    value={filters[field] ?? ''}
                    onChange={(e) => setGlobalFilter(field, e.target.value)}
                    className="w-full rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] text-gray-500"
                  >
                    <option value="">{field === 'category' ? 'All' : 'All'}</option>
                    {field === 'category'
                      ? [...new Set(data.map((r) => r.folder).filter(Boolean))].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))
                      : STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </th>
              ))}
              {displayColumns.filter((f) => !['category', 'spfStatus', 'dkimStatus', 'dmarcStatus'].includes(f)).map((field) => (
                <th key={field} className="px-3 py-1.5" />
              ))}
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.map((row, idx) => (
              <tr
                key={row.uid}
                className={cn(
                  'transition-colors hover:bg-gray-50/60',
                  selectedRows.has(row.uid) && 'bg-brand-50/40',
                )}
              >
                <td className="px-2 py-1.5">
                  <button onClick={() => toggleRow(row.uid)} className="flex items-center justify-center">
                    {selectedRows.has(row.uid) ? (
                      <CheckSquare className="h-4 w-4 text-brand-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-300" />
                    )}
                  </button>
                </td>
                <td className="px-2 py-1.5 text-[11px] text-gray-400">
                  {String(safePage * pageSize + idx + 1).padStart(2, '0')}
                </td>
                {displayColumns.map((field) => {
                  if (field === 'category') {
                    const cat = (row.folder ?? 'UNKNOWN').toUpperCase();
                    return (
                      <td key={field} className="px-3 py-1.5">
                        <Badge variant={cat === 'INBOX' ? 'info' : 'default'}>{cat}</Badge>
                      </td>
                    );
                  }
                  if (field === 'domain') {
                    const domain = getDomain(row);
                    if (!domain) return <td key={field} className="px-3 py-1.5 text-[11px] text-gray-300">—</td>;
                    return (
                      <td key={field} className="px-3 py-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-700 group">
                          <span className="truncate max-w-[140px]">{domain}</span>
                          <button
                            onClick={() => copyField(domain)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </span>
                      </td>
                    );
                  }
                  if (['spfStatus', 'dkimStatus', 'dmarcStatus', 'ip', 'origin'].includes(field)) {
                    return (
                      <td key={field} className="px-3 py-1.5">
                        <Badge variant="default">{statusBadge(undefined)}</Badge>
                      </td>
                    );
                  }
                  const val = row[field as ExtractField];
                  const text = val === undefined || val === null ? '' : Array.isArray(val) ? val.map(String).join(', ') : String(val);

                  if (field === 'fromEmail') {
                    const addr = text;
                    return (
                      <td key={field} className="px-3 py-1.5 group">
                        {addr ? (
                          <span className="inline-flex items-center gap-1 max-w-[200px]">
                            <span className="truncate text-[11px] text-gray-700 group-hover:text-gray-900" title={addr}>{addr}</span>
                            <button
                              onClick={() => copyField(addr)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 flex-shrink-0"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </td>
                    );
                  }

                  if (field === 'subject') {
                    const isExpanded = expandedSubject === row.uid;
                    return (
                      <td key={field} className="px-3 py-1.5 max-w-[280px]">
                        {text ? (
                          <button
                            onClick={() => setExpandedSubject(isExpanded ? null : row.uid)}
                            className="text-left text-[11px] text-gray-700 hover:text-brand-600 truncate block w-full max-w-[280px]"
                            title={text}
                          >
                            {isExpanded ? text : truncate(text, 42)}
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </td>
                    );
                  }

                  return (
                    <td key={field} className="px-3 py-1.5 max-w-[220px]">
                      <span className="truncate block text-[11px] text-gray-700" title={text}>
                        {text || '—'}
                      </span>
                    </td>
                  );
                })}
                <td className="px-2 py-1.5">
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuUid(openMenuUid === row.uid ? null : row.uid)}
                      className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {openMenuUid === row.uid && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-card-lg animate-fade-in">
                        <button
                          onClick={() => { copyEmails([row]); setOpenMenuUid(null); }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50"
                        >
                          <CopyCheck className="h-3 w-3" /> Copy email
                        </button>
                        <button
                          onClick={() => { copyField(JSON.stringify(row)); setOpenMenuUid(null); }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50"
                        >
                          <Copy className="h-3 w-3" /> Copy row
                        </button>
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          onClick={() => { exportRows([row], 'csv'); setOpenMenuUid(null); }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="h-3 w-3" /> Export row (CSV)
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
        <span className="text-[11px] text-gray-500">
          Showing {sorted.length === 0 ? 0 : safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} of {formatNumber(sorted.length)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(safePage - 1)}
            disabled={safePage === 0}
            className="btn-ghost text-[11px] py-1 px-2 disabled:opacity-30"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(0, Math.min(safePage - 2, totalPages - 5));
            const pageNum = start + i;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                  pageNum === safePage ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPage(safePage + 1)}
            disabled={safePage >= totalPages - 1}
            className="btn-ghost text-[11px] py-1 px-2 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
