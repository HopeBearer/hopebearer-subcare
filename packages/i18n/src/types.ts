import { InitOptions } from 'i18next';

export interface I18nConfig {
  /**
   * Default language (e.g., 'en')
   */
  defaultLanguage: string;
  /**
   * Fallback language if translation is missing
   */
  fallbackLanguage?: string;
  /**
   * Default namespace (e.g., 'common')
   */
  defaultNS?: string;
  /**
   * Path pattern for loading locales (e.g., '/locales/{{lng}}/{{ns}}.json')
   */
  localePath?: string;
  /**
   * Enable debug mode
   */
  debug?: boolean;
}

export type { InitOptions };
