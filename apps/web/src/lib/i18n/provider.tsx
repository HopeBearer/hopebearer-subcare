'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n, i18n } from './index';
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n(config);

    const storedLang = localStorage.getItem('i18nextLng');
    const targetLang = storedLang || config.defaultLanguage;
    
    // Ensure DOM is consistent with local storage on mount
    document.documentElement.lang = targetLang;

    i18n.changeLanguage(targetLang).then(() => {
      setReady(true);
    });

    const handleLanguageChanged = (lng: string) => {
      localStorage.setItem('i18nextLng', lng);
      document.documentElement.lang = lng;
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [config]);

  if (!ready) return null; // 或 Skeleton

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
