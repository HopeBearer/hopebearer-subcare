# @subcare/i18n

Shared i18n package for SubCare apps using `i18next` and `react-i18next`.

## Features

- **InitI18n**: Centralized initialization logic.
- **Hooks**: `useTranslation` with simplified API.
- **Provider**: `I18nProvider` for easy setup in Next.js.
- **Async Loading**: Loads translations from `/public/locales`.
- **Type Safety**: Supports TypeScript type augmentation.

## Usage

### 1. Installation

In your app (e.g., `apps/web`):

```bash
pnpm add @subcare/i18n
```

### 2. Directory Structure

Place your translation files in `public/locales`:

```
apps/web/
  public/
    locales/
      en/
        common.json
        auth.json
      zh/
        common.json
        auth.json
```

### 3. Type Safety (Important)

To get type safety for your keys, create a declaration file in your app (e.g., `apps/web/src/types/i18next.d.ts`):

```typescript
import 'i18next';
import common from '../../public/locales/en/common.json';
import auth from '../../public/locales/en/auth.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      auth: typeof auth;
    };
  }
}
```

### 4. Initialization

Wrap your application in `apps/web/src/app/providers.tsx` (or directly in layout if using client components):

```typescript
'use client';

import { I18nProvider } from '@subcare/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider
      config={{
        defaultLanguage: 'en',
        defaultNS: 'common',
        localePath: '/locales/{{lng}}/{{ns}}.json', // optional, default
      }}
    >
      {children}
    </I18nProvider>
  );
}
```

### 5. Using Hooks

In your components:

```typescript
'use client';

import { useTranslation } from '@subcare/i18n';

export function LanguageSwitcher() {
  const { t, changeLanguage, language } = useTranslation();

  return (
    <div>
      <p>{t('common.welcome')}</p>
      <button onClick={() => changeLanguage('zh')}>中文</button>
      <button onClick={() => changeLanguage('en')}>English</button>
    </div>
  );
}
```
