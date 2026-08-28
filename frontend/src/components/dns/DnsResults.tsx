'use client';

import { DnsRecord } from '@/types/dns';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/utils';
import { Copy, ExternalLink } from 'lucide-react';

interface DnsResultsProps {
  domain: string;
  records: DnsRecord[];
  queryTime: number;
}

const TYPE_COLORS: Record<string, string> = {
  A: 'bg-blue-50 text-blue-700',
  AAAA: 'bg-indigo-50 text-indigo-700',
  MX: 'bg-emerald-50 text-emerald-700',
  TXT: 'bg-amber-50 text-amber-700',
  CNAME: 'bg-purple-50 text-purple-700',
  NS: 'bg-cyan-50 text-cyan-700',
  SOA: 'bg-rose-50 text-rose-700',
  SRV: 'bg-teal-50 text-teal-700',
  DMARC: 'bg-red-50 text-red-700',
  SPF: 'bg-orange-50 text-orange-700',
};

export function DnsResults({ domain, records, queryTime }: DnsResultsProps) {
  if (records.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-12 text-center">
        <Globe className="h-10 w-10 text-gray-300 mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 mb-1">No records found</h3>
        <p className="text-sm text-gray-500">No DNS records match the selected types for this domain.</p>
      </div>
    );
  }

  const grouped = records.reduce<Record<string, DnsRecord[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{domain}</h3>
          <Badge variant="default">{records.length} records</Badge>
        </div>
        <span className="text-xs text-gray-500">Queried in {queryTime}ms</span>
      </div>

      {Object.entries(grouped).map(([type, typeRecords]) => (
        <div key={type} className="card overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-2.5 bg-gray-50/80 flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700'}`}>
              {type}
            </span>
            <span className="text-xs text-gray-500">{typeRecords.length} record{typeRecords.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {typeRecords.map((record, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 transition-colors">
                <span className="text-xs text-gray-500 min-w-[120px]">{record.host}</span>
                <span className="text-xs text-gray-900 font-mono flex-1 break-all">{record.value}</span>
                {record.ttl !== undefined && (
                  <span className="text-[10px] text-gray-400">TTL: {record.ttl}s</span>
                )}
                {record.priority !== undefined && (
                  <span className="text-[10px] text-gray-400">Pri: {record.priority}</span>
                )}
                <button
                  onClick={() => copyValue(record.value)}
                  className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                  title="Copy value"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Globe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
      <path d="M2 12h20"/>
    </svg>
  );
}
