'use client';

interface StatsBarProps {
  found: number;
  processed: number;
  duplicates: number;
  errors: number;
  selected: number;
}

export function StatsBar({ found, processed, duplicates, errors, selected }: StatsBarProps) {
  const stats = [
    { label: 'Found', value: found, color: 'text-brand-600' },
    { label: 'Processed', value: processed, color: 'text-gray-900' },
    { label: 'Duplicates', value: duplicates, color: 'text-amber-600' },
    { label: 'Errors', value: errors, color: errors > 0 ? 'text-red-600' : 'text-gray-900' },
    { label: 'Selected', value: selected, color: 'text-violet-600' },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="stat-card animate-fade-in">
          <p className={`text-lg font-semibold ${s.color}`}>{s.value.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
