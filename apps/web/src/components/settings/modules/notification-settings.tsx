'use client';

import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/lib/i18n/hooks';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { useState } from 'react';

export function NotificationSettings() {
  const { t } = useTranslation('settings');
  
  // Mock state
  const [settings, setSettings] = useState({
    email_subscription: true,
    email_security: true,
    push_reminders: true,
    push_updates: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          {t('notifications.title', 'Notifications')}
        </h2>
        <p className="text-secondary text-sm">
          {t('notifications.description', 'Choose how and when you want to be notified')}
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-pale rounded-lg text-primary">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('notifications.email', 'Email Notifications')}
            </h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('notifications.sub_reminders', 'Subscription Reminders')}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {t('notifications.sub_reminders_desc', 'Get notified before your subscriptions renew')}
                </p>
              </div>
              <Switch 
                checked={settings.email_subscription} 
                onCheckedChange={() => toggle('email_subscription')}
              />
            </div>

            <div className="border-t border-base" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('notifications.security', 'Security Alerts')}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {t('notifications.security_desc', 'Get notified about suspicious activity')}
                </p>
              </div>
              <Switch 
                checked={settings.email_security} 
                onCheckedChange={() => toggle('email_security')}
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-pale rounded-lg text-primary">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('notifications.push', 'Push Notifications')}
            </h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('notifications.push_reminders', 'Due Date Reminders')}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {t('notifications.push_reminders_desc', 'Instant notifications for upcoming payments')}
                </p>
              </div>
              <Switch 
                checked={settings.push_reminders} 
                onCheckedChange={() => toggle('push_reminders')}
              />
            </div>

            <div className="border-t border-base" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('notifications.product_updates', 'Product Updates')}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {t('notifications.product_updates_desc', 'News about new features and improvements')}
                </p>
              </div>
              <Switch 
                checked={settings.push_updates} 
                onCheckedChange={() => toggle('push_updates')}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
