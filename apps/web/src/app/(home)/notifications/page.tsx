'use client';

import { PageMeta } from '@/components/page-meta';
import { NotificationList } from '@/components/features/notifications/notification-list';
import { useTranslation } from '@/lib/i18n/hooks';

export default function NotificationsPage() {
  const { t } = useTranslation('common');

  return (
    <>
      <PageMeta 
        titleKey="nav.notifications" 
        descriptionKey="metadata.notifications.description" 
      />
      
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        <NotificationList />
      </div>
    </>
  );
}
