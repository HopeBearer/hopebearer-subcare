import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { I18nConfig } from './types';
import { resources } from './locales';

export const initI18n = (config: I18nConfig) => {
  if (i18n.isInitialized) {
    return i18n;
  }

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: config.defaultLanguage, // Force initial language to match server to avoid hydration mismatch
      fallbackLng: config.fallbackLanguage || config.defaultLanguage,
      defaultNS: config.defaultNS || 'common',
      debug: config.debug || process.env.NODE_ENV === 'development',
      interpolation: {
        escapeValue: false, 
      },
      detection: {
        order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
        caches: [], // Disable auto-caching to prevent overwriting user preference on init
        lookupQuerystring: 'lang',
        lookupCookie: 'i18next',
        lookupLocalStorage: 'i18nextLng',
      },
      react: {
        useSuspense: false, // Resources are bundled, so no suspense needed
      },
    });

  return i18n;
};

export { i18n };
export * from './types';
export * from './hooks';
export * from './provider';
export { Trans } from 'react-i18next';
