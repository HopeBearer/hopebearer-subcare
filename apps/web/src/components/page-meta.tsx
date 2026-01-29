'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';

interface PageMetaProps {
  titleKey: string;
  descriptionKey: string;
  namespace?: string;
}

export function PageMeta({ titleKey, descriptionKey, namespace = 'common' }: PageMetaProps) {
  const { t } = useTranslation(namespace);

  useEffect(() => {
    // We use common:app_name always
    const appName = t('app_name', { ns: 'common' });
    const pageTitle = t(titleKey);
    
    document.title = `${pageTitle} - ${appName}`;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', t(descriptionKey));
  }, [t, titleKey, descriptionKey, namespace]);

  return null;
}
