'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from './index';
import { I18nConfig } from './types';

// Suppress Fast Refresh logs in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalLog = console.log;
  const originalInfo = console.info;
  
  const shouldSuppress = (msg: any) => {
    if (typeof msg === 'string') {
        return msg.includes('[Fast Refresh]') || msg.includes('i18next:');
    }
    return false;
  };

  console.log = (...args) => {
    if (!shouldSuppress(args[0])) {
      originalLog.apply(console, args);
    }
  };

  console.info = (...args) => {
    if (!shouldSuppress(args[0])) {
      originalInfo.apply(console, args);
    }
  };
}

interface I18nProviderProps {
  children: ReactNode;
  config: I18nConfig;
}

export const I18nProvider = ({ children, config }: I18nProviderProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Client-side language detection and switch
    const storedLang = localStorage.getItem('i18nextLng');
    
    // If no stored lang, we could check navigator.language here if we wanted
    // But for now, we follow existing logic: Stored OR Default
    const targetLang = storedLang || config.defaultLanguage;
    
    // Ensure DOM is consistent with local storage on mount
    document.documentElement.lang = targetLang;

    if (i18n.language !== targetLang) {
        i18n.changeLanguage(targetLang);
    }

    const handleLanguageChanged = (lng: string) => {
      localStorage.setItem('i18nextLng', lng);
      document.documentElement.lang = lng;
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [config]);

  // We render children immediately because i18n is already initialized (with default lang).
  // The useEffect above handles switching to user preference.
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
