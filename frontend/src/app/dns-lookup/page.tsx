'use client';

import { Header } from '@/components/Header';
import { DnsForm } from '@/components/dns/DnsForm';
import { DnsResults } from '@/components/dns/DnsResults';
import { useDnsLookup } from '@/hooks/useDnsLookup';

export default function DnsLookupPage() {
  const { state, lookup, reset } = useDnsLookup();

  return (
    <div className="space-y-6 animate-fade-in">
      <Header
        title="DNS Lookup"
        description="Query DNS records for any domain including A, AAAA, MX, TXT, NS, SOA, DMARC, and SPF."
      />

      <DnsForm onLookup={lookup} loading={state.loading} />

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in">
          {state.error}
        </div>
      )}

      {state.records.length > 0 && (
        <DnsResults
          domain={state.domain}
          records={state.records}
          queryTime={state.queryTime}
        />
      )}

      {state.records.length === 0 && !state.loading && !state.error && state.domain && (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-gray-500">No DNS records found for this domain.</p>
        </div>
      )}
    </div>
  );
}
