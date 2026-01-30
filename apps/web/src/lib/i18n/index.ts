import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// import LanguageDetector from 'i18next-browser-languagedetector'; // Removed to avoid auto-detection causing hydration mismatch
import { I18nConfig } from './types';
import { resources } from './locales';

const defaultConfig = {
  defaultLanguage: 'zh',
  fallbackLanguage: 'en',
  defaultNS: 'common',
};

// Initialize immediately to support SSR and direct navigation
if (!i18n.isInitialized) {
  i18n.use(initReactI18next);

  i18n.init({
    resources,
    lng: defaultConfig.defaultLanguage, // Always start with default language to match Server and avoid hydration mismatch
    fallbackLng: defaultConfig.fallbackLanguage,
    defaultNS: defaultConfig.defaultNS,
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    // Manual detection handling in Provider to ensure consistency
    react: {
      useSuspense: false,
    },
  });
}

export const initI18n = (config: I18nConfig) => {
  return i18n;
};

export { i18n };
export * from './types';
export * from './hooks';
export * from './provider';
export { Trans } from 'react-i18next';
