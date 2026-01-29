import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { I18nConfig } from './types';

export const initI18n = (config: I18nConfig) => {
  if (i18n.isInitialized) {
    return i18n;
  }

  i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      lng: undefined, 
      fallbackLng: config.fallbackLanguage || config.defaultLanguage,
      defaultNS: config.defaultNS || 'common',
      debug: false,
      interpolation: {
        escapeValue: false, 
      },
      backend: {
        loadPath: config.localePath || '/locales/{{lng}}/{{ns}}.json',
      },
      detection: {
        order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage', 'cookie'],
        lookupQuerystring: 'lang',
        lookupCookie: 'i18next',
        lookupLocalStorage: 'i18nextLng',
      },
      react: {
        useSuspense: true,
      },
    });

  return i18n;
};

export { i18n };
export * from './types';
export * from './hooks';
export * from './provider';
export { Trans } from 'react-i18next';
