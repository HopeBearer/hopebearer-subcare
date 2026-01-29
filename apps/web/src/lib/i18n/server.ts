import { resources } from './locales';

type Resources = typeof resources;
type Lang = keyof Resources;

export const getTranslation = (lang: string) => {
  // Fallback to 'zh' if lang is not found in resources, or check if language starts with supported code
  let validLang: Lang = 'zh';
  
  if (lang in resources) {
    validLang = lang as Lang;
  } else {
    // Try to match partial (e.g. 'en-US' -> 'en')
    const prefix = lang.split('-')[0] as Lang;
    if (prefix in resources) {
      validLang = prefix;
    }
  }

  const selectedResources = resources[validLang];

  return (key: string) => {
    const parts = key.split(':');
    let namespace = 'common'; // Default namespace
    let path = key;

    if (parts.length === 2) {
      namespace = parts[0];
      path = parts[1];
    }

    const ns = namespace as keyof typeof selectedResources;
    if (!selectedResources[ns]) return key;

    const keys = path.split('.');
    let value: any = selectedResources[ns];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k as keyof typeof value];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  };
};
