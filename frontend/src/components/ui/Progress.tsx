import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md';
  color?: 'brand' | 'success' | 'warning' | 'error';
}

const colorClasses = {
  brand: 'bg-brand-600',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

export function Progress({ value, max = 100, className, size = 'md', color = 'brand' }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-gray-200', height, className)}>
      <div
        className={cn('rounded-full transition-all duration-500 ease-out', height, colorClasses[color])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
