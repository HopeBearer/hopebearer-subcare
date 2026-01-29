'use client';

import { useThemeStore } from '@/store';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder or null to avoid mismatch
    return <div className={cn("w-9 h-9", className)} />; 
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ease-out',
        'hover:bg-primary-pale hover:text-primary dark:hover:bg-white/5', // Consistent with language switcher hover but adapted for dark
        'focus:outline-none focus:ring-2 focus:ring-primary-light',
        className
      )}
      aria-label="Toggle Theme"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-5 h-5">
        <Sun 
          className={cn(
            "absolute inset-0 w-full h-full transition-all duration-300 transform",
            isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100 text-secondary hover:text-primary"
          )} 
        />
        <Moon 
          className={cn(
            "absolute inset-0 w-full h-full transition-all duration-300 transform",
            isDark ? "opacity-100 rotate-0 scale-100 text-primary" : "opacity-0 -rotate-90 scale-0"
          )} 
        />
      </div>
    </button>
  );
}
