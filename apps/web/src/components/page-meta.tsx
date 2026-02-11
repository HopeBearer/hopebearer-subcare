'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useSiteSettingsStore } from '@/store';

interface PageMetaProps {
  titleKey: string;
  descriptionKey: string;
  namespace?: string;
}

export function PageMeta({ titleKey, descriptionKey, namespace = 'common' }: PageMetaProps) {
  const { t } = useTranslation(namespace);
  const { settings } = useSiteSettingsStore();

  useEffect(() => {
    // 优先使用系统设置中的站点名称，降级到 i18n 翻译
    const appName = settings?.['site.name'] || t('app_name', { ns: 'common' });
    const pageTitle = t(titleKey);
    
    document.title = `${pageTitle} - ${appName}`;

    // Update meta description — 优先使用系统设置中的站点描述
    const siteDescription = settings?.['site.description'];
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', siteDescription || t(descriptionKey));
  }, [t, titleKey, descriptionKey, namespace, settings]);

  return null;
}
