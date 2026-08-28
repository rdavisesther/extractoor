'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ListChecks, CheckSquare, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldSectionProps {
  selectedFields: string[];
  setSelectedFields: (v: string[]) => void;
}

const ALL_FIELDS = [
  { id: 'fromName', label: 'From Name' },
  { id: 'fromEmail', label: 'From Email' },
  { id: 'to', label: 'To' },
  { id: 'cc', label: 'CC' },
  { id: 'bcc', label: 'BCC' },
  { id: 'subject', label: 'Subject' },
  { id: 'date', label: 'Date' },
  { id: 'messageId', label: 'Message ID' },
  { id: 'replyTo', label: 'Reply-To' },
  { id: 'textBody', label: 'Plain Text Body' },
  { id: 'htmlBody', label: 'HTML Body' },
  { id: 'attachments', label: 'Attachments' },
];

const DEFAULT_FIELDS = ['fromName', 'fromEmail', 'to', 'subject', 'date'];

export function FieldSection({ selectedFields, setSelectedFields }: FieldSectionProps) {
  const allSelected = selectedFields.length === ALL_FIELDS.length;
  const displayLabel = useMemo(() => {
    if (selectedFields.length === 0) return 'None selected';
    if (selectedFields.length <= 2) {
      return selectedFields.map((f) => ALL_FIELDS.find((af) => af.id === f)?.label ?? f).join(' + ');
    }
    const first = ALL_FIELDS.find((af) => af.id === selectedFields[0])?.label ?? selectedFields[0];
    return `${first} + ${selectedFields.length - 1} more`;
  }, [selectedFields]);

  const toggle = (id: string) => {
    if (selectedFields.includes(id)) {
      setSelectedFields(selectedFields.filter((f) => f !== id));
    } else {
      setSelectedFields([...selectedFields, id]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
            <ListChecks className="h-4 w-4 text-emerald-600" />
          </div>
          <CardTitle>Data Fields to Extract</CardTitle>
        </div>
        <Badge variant="info">{selectedFields.length} fields</Badge>
      </CardHeader>

      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          Selected: <span className="font-medium text-gray-700">{displayLabel}</span>
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedFields(ALL_FIELDS.map((f) => f.id))}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            Select All
          </button>
          {selectedFields.length > 0 && (
            <button
              onClick={() => setSelectedFields([])}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1">
          {ALL_FIELDS.map((field) => {
            const selected = selectedFields.includes(field.id);
            return (
              <button
                key={field.id}
                onClick={() => toggle(field.id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-all duration-100',
                  selected ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {selected ? (
                  <CheckSquare className="h-4 w-4 text-brand-600 flex-shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-gray-300 flex-shrink-0" />
                )}
                <span className="truncate text-xs">{field.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export { DEFAULT_FIELDS };
