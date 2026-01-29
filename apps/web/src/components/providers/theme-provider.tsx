'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, _hasHydrated } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both classes first
    root.classList.remove('light', 'dark');
    
    if (!_hasHydrated) {
      // While hydrating, we might want to respect system preference if no stored value
      // But since we use persist, _hasHydrated will be false initially.
      // We can rely on system preference or default 'light'.
      return;
    }

    // Apply the current theme
    root.classList.add(theme);
    
    // Update color-scheme style for scrollbars etc.
    root.style.colorScheme = theme;

  }, [theme, _hasHydrated]);

  // Avoid hydration mismatch by not rendering theme-dependent children if necessary
  // But here we just updating the root class, so children are fine.
  
  return <>{children}</>;
}
