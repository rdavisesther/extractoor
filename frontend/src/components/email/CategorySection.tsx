'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Folder, Search, CheckSquare, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategorySectionProps {
  categories: string[];
  selectedCategories: string[];
  setSelectedCategories: (v: string[]) => void;
  loading: boolean;
}

const FRIENDLY_NAMES: Record<string, string> = {
  'INBOX': 'Inbox',
  '[Gmail]/Sent Mail': 'Sent',
  '[Gmail]/Sent': 'Sent',
  'Sent Messages': 'Sent',
  'Sent Items': 'Sent',
  '[Gmail]/Spam': 'Spam',
  'Junk': 'Spam',
  'Junk Email': 'Spam',
  '[Gmail]/Trash': 'Trash',
  'Deleted Items': 'Trash',
  'Trash': 'Trash',
  '[Gmail]/Drafts': 'Drafts',
  'Drafts': 'Drafts',
  '[Gmail]/All Mail': 'All Mail',
  '[Gmail]/Starred': 'Starred',
  'Flagged': 'Starred',
  '[Gmail]/Important': 'Important',
  'Archive': 'Archive',
  'Archives': 'Archive',
};

function friendlyName(path: string): string {
  return FRIENDLY_NAMES[path] ?? path.split('/').pop() ?? path;
}

export function CategorySection({ categories, selectedCategories, setSelectedCategories, loading }: CategorySectionProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => friendlyName(c).toLowerCase().includes(q) || c.toLowerCase().includes(q));
  }, [categories, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedCategories.includes(c));

  const toggle = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const selectAll = () => setSelectedCategories([...categories]);
  const clearAll = () => setSelectedCategories([]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50">
            <Folder className="h-4 w-4 text-amber-600" />
          </div>
          <CardTitle>Email Categories</CardTitle>
        </div>
        {selectedCategories.length > 0 && (
          <Badge variant="info">{selectedCategories.length} selected</Badge>
        )}
      </CardHeader>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-8 w-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">
          Connect to a mailbox to load available categories.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-8 py-2 text-xs"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={allFilteredSelected ? clearAll : selectAll}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
            >
              {allFilteredSelected ? 'Clear All' : 'Select All'}
            </button>
            {selectedCategories.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear ({selectedCategories.length})
              </button>
            )}
          </div>

          <div className="max-h-40 overflow-y-auto space-y-0.5 scroll-thin">
            {filtered.map((cat) => {
              const selected = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-all duration-100',
                    selected ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  {selected ? (
                    <CheckSquare className="h-4 w-4 text-brand-600 flex-shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  )}
                  <span className="truncate">{friendlyName(cat)}</span>
                  {cat !== friendlyName(cat) && (
                    <span className="text-[10px] text-gray-400 truncate ml-auto">{cat}</span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-gray-500 py-2 text-center">No matching categories</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
