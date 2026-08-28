'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { checkHealth } from '@/lib/api';
import { Activity } from 'lucide-react';

interface HeaderProps {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, className, actions }: HeaderProps) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await checkHealth();
      if (mounted) setOnline(ok);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {actions}
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs shadow-sm">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              online === null
                ? 'bg-gray-300 animate-pulse-dot'
                : online
                  ? 'bg-emerald-500'
                  : 'bg-red-500',
            )}
          />
          <span className="text-gray-600">
            {online === null ? 'Checking...' : online ? 'API Connected' : 'API Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}
