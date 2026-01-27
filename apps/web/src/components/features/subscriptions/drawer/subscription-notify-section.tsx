'use client';

import { Subscription } from './types';
import { Bell } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Trans } from 'react-i18next';

interface SubscriptionNotifySectionProps {
  subscription: Subscription;
}

export function SubscriptionNotifySection({ subscription }: SubscriptionNotifySectionProps) {
  const { t } = useTranslation(['subscription', 'common']);

  return (
    <section className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-lavender/10 rounded-md text-lavender">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {t('reminders', { defaultValue: 'Reminders' })}
            </div>
            <div className="text-xs text-zinc-500">
              {subscription.enableNotification 
                ? t('notifications_enabled', { defaultValue: 'Notifications are enabled' })
                : t('notifications_disabled', { defaultValue: 'Notifications disabled' })
              }
            </div>
          </div>
        </div>
        
        <div 
          className={`w-2 h-2 rounded-full ${subscription.enableNotification ? 'bg-green-500' : 'bg-zinc-300'}`}
        />
      </div>

      {subscription.enableNotification && (
        <div className="mt-3 pl-10">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            <Trans 
              i18nKey="alert_before"
              ns="subscription"
              values={{ days: subscription.notifyDaysBefore }}
              defaults="Alert me <bold>{{days}} days</bold> before renewal."
              components={{ bold: <span key="bold" className="font-semibold text-zinc-900 dark:text-white" /> }}
            />
          </p>
        </div>
      )}
    </section>
  );
}
