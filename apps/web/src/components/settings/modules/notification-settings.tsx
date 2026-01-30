'use client';

import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/lib/i18n/hooks';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { notificationService, NotificationSetting } from '@/services/notification.service';
import { toast } from 'sonner';

export function NotificationSettings() {
  const { t } = useTranslation('settings');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSetting[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await notificationService.getSettings();
      setSettings(data);
    } catch (error) {
      toast.error(t('notifications.load_error', 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (type: string, channel: 'email' | 'inApp', value: boolean) => {
    // Optimistic update
    const previousSettings = [...settings];
    setSettings(prev => prev.map(s => 
      s.type === type ? { ...s, [channel]: value } : s
    ));

    try {
      await notificationService.updateSetting({ type, [channel]: value });
    } catch (error) {
      // Revert on error
      setSettings(previousSettings);
      toast.error(t('notifications.update_error', 'Failed to update setting'));
    }
  };

  const getSetting = (type: string) => settings?.find(s => s.type === type) || { email: true, inApp: true };

  if (loading) {
    return <div className="p-4 text-center text-sm text-gray-500">Loading settings...</div>;
  }

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
        
        {/* Email Notifications */}
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
                  {t('notifications.billing_reminders', 'Billing Reminders')}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {t('notifications.billing_reminders_desc', 'Get notified when a subscription is due for renewal')}
                </p>
              </div>
              <Switch 
                checked={getSetting('billing').email} 
                onCheckedChange={(checked) => updateSetting('billing', 'email', checked)}
              />
            </div>

            <div className="border-t border-base" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('notifications.system_updates', 'System Updates')}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {t('notifications.system_updates_desc', 'Important announcements and feature updates')}
                </p>
              </div>
              <Switch 
                checked={getSetting('system').email} 
                onCheckedChange={(checked) => updateSetting('system', 'email', checked)}
              />
            </div>
          </div>
        </Card>

        {/* In-App Notifications */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-pale rounded-lg text-primary">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('notifications.in_app', 'In-App Notifications')}
            </h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('notifications.billing_reminders', 'Billing Reminders')}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {t('notifications.billing_reminders_desc', 'Get notified inside the app about renewals')}
                </p>
              </div>
              <Switch 
                checked={getSetting('billing').inApp} 
                onCheckedChange={(checked) => updateSetting('billing', 'inApp', checked)}
              />
            </div>

            <div className="border-t border-base" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('notifications.system_updates', 'System Updates')}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {t('notifications.system_updates_desc', 'Receive system announcements in your inbox')}
                </p>
              </div>
              <Switch 
                checked={getSetting('system').inApp} 
                onCheckedChange={(checked) => updateSetting('system', 'inApp', checked)}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
