'use client';

import { useState, useCallback } from 'react';
import { apiPost } from '@/lib/api';
import { DnsRecord } from '@/types/dns';

interface DnsLookupState {
  domain: string;
  selectedTypes: string[];
  loading: boolean;
  records: DnsRecord[];
  queryTime: number;
  error: string;
}

const INITIAL_STATE: DnsLookupState = {
  domain: '',
  selectedTypes: ['A', 'AAAA', 'MX', 'TXT', 'NS'],
  loading: false,
  records: [],
  queryTime: 0,
  error: '',
};

export function useDnsLookup() {
  const [state, setState] = useState<DnsLookupState>(INITIAL_STATE);

  const update = useCallback((patch: Partial<DnsLookupState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const lookup = useCallback(async (domain: string, types: string[]) => {
    update({ loading: true, error: '', domain, selectedTypes: types });
    try {
      const result = await apiPost<{ success: boolean; records: DnsRecord[]; queryTime: number; error?: string }>(
        '/api/dns/lookup',
        { domain, types },
      );
      if (result.success) {
        update({ records: result.records, queryTime: result.queryTime, loading: false });
      } else {
        update({ error: result.error ?? 'Lookup failed.', loading: false });
      }
    } catch (err) {
      update({
        error: err instanceof Error ? err.message : 'DNS lookup failed.',
        loading: false,
      });
    }
  }, [update]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return { state, update, lookup, reset };
}
