'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n, i18n } from './index';
import { I18nConfig } from './types';

interface I18nProviderProps {
  children: ReactNode;
  config: I18nConfig;
}

export const I18nProvider = ({ children, config }: I18nProviderProps) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n(config);

    const storedLang = localStorage.getItem('i18nextLng');
    const targetLang = storedLang || config.language;

    i18n.changeLanguage(targetLang).then(() => {
      setReady(true);
    });

    const handleLanguageChanged = (lng: string) => {
      localStorage.setItem('i18nextLng', lng);
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [config]);

  if (!ready) return null; // 或 Skeleton

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
