'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Globe, Search } from 'lucide-react';

interface DnsFormProps {
  onLookup: (domain: string, types: string[]) => void;
  loading: boolean;
}

const DNS_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'CNAME', 'NS', 'SOA', 'SRV', 'DMARC', 'SPF'];

const DEFAULT_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS'];

export function DnsForm({ onLookup, loading }: DnsFormProps) {
  const [domain, setDomain] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(DEFAULT_TYPES);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleSubmit = () => {
    if (!domain.trim() || selectedTypes.length === 0) return;
    onLookup(domain.trim(), selectedTypes);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50">
            <Globe className="h-4 w-4 text-brand-600" />
          </div>
          <CardTitle>DNS Lookup</CardTitle>
        </div>
      </CardHeader>

      <div className="space-y-3">
        <Input
          label="Domain"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        <div className="space-y-1.5">
          <label className="label-text">Record Types</label>
          <div className="flex flex-wrap gap-1.5">
            {DNS_TYPES.map((type) => {
              const selected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-100 ${
                    selected
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!domain.trim() || selectedTypes.length === 0}
          icon={<Search className="h-4 w-4" />}
          className="w-full"
        >
          Lookup DNS Records
        </Button>
      </div>
    </Card>
  );
}
