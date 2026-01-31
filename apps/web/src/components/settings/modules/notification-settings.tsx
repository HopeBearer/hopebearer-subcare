'use client';

import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/lib/i18n/hooks';
import { Bell, Mail, ChevronRight, ChevronDown } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { notificationService, NotificationSetting } from '@/services/notification.service';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function NotificationSettings() {
  const { t } = useTranslation('settings');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  
  // Track open states for categories per channel
  const [openStates, setOpenStates] = useState<Record<string, Record<string, boolean>>>({
    email: { billing: true, system: true, security: true },
    inApp: { billing: true, system: true, security: true }
  });

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

  const updateSetting = async (key: string, channel: 'email' | 'inApp', value: boolean) => {
    // Optimistic update
    const previousSettings = [...settings];
    setSettings(prev => prev.map(s => 
      s.key === key ? { ...s, [channel]: value } : s
    ));

    try {
      await notificationService.updateSetting({ key, [channel]: value });
    } catch (error) {
      setSettings(previousSettings);
      toast.error(t('notifications.update_error', 'Failed to update setting'));
    }
  };

  const updateCategory = async (category: string, channel: 'email' | 'inApp', enabled: boolean) => {
      // Optimistic Update
      const previousSettings = [...settings];
      setSettings(prev => prev.map(s => {
          if (s.key === category || s.key.startsWith(`${category}.`)) {
              return { ...s, [channel]: enabled };
          }
          return s;
      }));

      try {
          const updatedSettings = await notificationService.updateCategory(category, enabled, channel);
          setSettings(updatedSettings);
      } catch (error) {
          setSettings(previousSettings);
          toast.error(t('notifications.update_error', 'Failed to update category'));
      }
  };

  const toggleCategory = (channel: 'email' | 'inApp', category: string) => {
      setOpenStates(prev => ({
          ...prev,
          [channel]: {
              ...prev[channel],
              [category]: !prev[channel]?.[category]
          }
      }));
  };

  // Group settings into tree
  const groupedSettings = useMemo(() => {
      const groups: Record<string, { parent: NotificationSetting | null, children: NotificationSetting[] }> = {};
      
      settings.forEach(setting => {
          const parts = setting.key.split('.');
          const category = parts[0];
          
          if (!groups[category]) {
              groups[category] = { parent: null, children: [] };
          }

          if (parts.length === 1) {
              groups[category].parent = setting;
          } else {
              groups[category].children.push(setting);
          }
      });
      return groups;
  }, [settings]);

  if (loading) {
    return <div className="p-4 text-center text-sm text-gray-500">Loading settings...</div>;
  }

  const categoryOrder = ['billing', 'system', 'security'];

  const renderChannelSection = (channel: 'email' | 'inApp') => {
      const icon = channel === 'email' ? <Mail className="w-5 h-5" /> : <Bell className="w-5 h-5" />;
      const title = channel === 'email' ? t('notifications.email', 'Email Notifications') : t('notifications.in_app', 'In-App Notifications');

      return (
          <Card className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="p-2 bg-primary-pale rounded-lg text-primary">
                      {icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {title}
                  </h3>
              </div>

              <div className="space-y-6">
                  {categoryOrder.map((catKey, index) => {
                      const group = groupedSettings[catKey];
                      if (!group) return null;
                      
                      const parent = group.parent || { key: catKey, email: true, inApp: true } as NotificationSetting;
                      const isParentEnabled = parent[channel];

                      return (
                          <div key={`${channel}-${catKey}`}>
                              {/* Category Header */}
                              <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                          <h4 className="text-base font-medium text-gray-900 dark:text-white capitalize">
                                              {t(`notifications.category.${catKey}`, catKey)}
                                          </h4>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                          {t(`notifications.category.${catKey}_desc`, `Manage ${catKey} notifications`)}
                                      </p>
                                  </div>
                                  <div className="flex items-center gap-3 ml-4">
                                      {group.children.length > 0 && (
                                            <Button 
                                                variant="ghost" 
                                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                onClick={() => toggleCategory(channel, catKey)}
                                            >
                                              {openStates[channel]?.[catKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                          </Button>
                                      )}
                                      <Switch 
                                          checked={isParentEnabled}
                                          onCheckedChange={(val) => updateCategory(catKey, channel, val)}
                                      />
                                  </div>
                              </div>

                              {/* Children */}
                              {group.children.length > 0 && openStates[channel]?.[catKey] && (
                                  <div className="mt-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-4 animate-in slide-in-from-top-1 fade-in">
                                      {group.children.map(child => (
                                          <div key={child.key} className="flex items-start justify-between group">
                                              <div className="flex-1 pr-4">
                                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                                      {t(`notifications.event.${child.key}`, child.key.split('.')[1] || child.key)}
                                                  </span>
                                                  {/* Render Description */}
                                                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                                                      {t(`notifications.event.${child.key}_desc`, '')}
                                                  </span>
                                              </div>
                                                <Switch 
                                                    checked={child[channel]}
                                                    onCheckedChange={(val) => updateSetting(child.key, channel, val)}
                                                    disabled={!isParentEnabled}
                                                />
                                          </div>
                                      ))}
                                  </div>
                              )}

                              {/* Divider */}
                              {index < categoryOrder.length - 1 && (
                                  <div className="h-px bg-gray-50 dark:bg-gray-800/50 mt-6" />
                              )}
                          </div>
                      );
                  })}
              </div>
          </Card>
      );
  };

  return (
    <div className="space-y-8">
        <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {t('notifications.title', 'Notifications')}
            </h2>
            <p className="text-secondary text-sm">
              {t('notifications.description', 'Choose how and when you want to be notified')}
            </p>
        </div>

        <div className="space-y-8">
            {renderChannelSection('inApp')}
            {renderChannelSection('email')}
        </div>
    </div>
  );
}
