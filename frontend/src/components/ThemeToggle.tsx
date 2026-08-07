'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { Button } from './ui';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="secondary" size="sm" onClick={toggle} aria-label="Toggle dark mode">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </Button>
  );
}
