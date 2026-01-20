'use client';

import { ReactNode, useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n, i18n } from './index';
import { I18nConfig } from './types';

interface I18nProviderProps {
  children: ReactNode;
  config: I18nConfig;
}

export const I18nProvider = ({ children, config }: I18nProviderProps) => {
  useMemo(() => {
    initI18n(config);
  }, [config]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
