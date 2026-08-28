'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NAV_ITEMS = [
  {
    label: 'Email Extraction',
    href: '/email-extraction',
    icon: Mail,
    description: 'Extract emails via IMAP',
  },
  {
    label: 'DNS Lookup',
    href: '/dns-lookup',
    icon: Globe,
    description: 'Query DNS records',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-gray-200 bg-white transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        <div className={cn('flex h-16 items-center gap-2.5 border-b border-gray-200 px-4', collapsed && 'justify-center px-0')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold flex-shrink-0">
            M
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="text-sm font-semibold text-gray-900">MailCMH</span>
              <p className="text-[10px] text-gray-400 leading-tight">Email & DNS Tooling</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                    isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600',
                  )}
                />
                {!collapsed && (
                  <div className="overflow-hidden">
                    <span className="block truncate">{item.label}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-20 bg-black/20 backdrop-blur-sm md:hidden',
          collapsed ? 'hidden' : 'hidden',
        )}
      />
    </>
  );
}
