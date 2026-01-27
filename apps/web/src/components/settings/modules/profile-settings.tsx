'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/hooks';
import { useAuthStore } from '@/store/auth.store';
import { Camera } from 'lucide-react';

export function ProfileSettings() {
  const { t } = useTranslation('settings'); // Assuming 'common' or specific namespace
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          {t('profile.title', 'Public Profile')}
        </h2>
        <p className="text-secondary text-sm">
          {t('profile.description', 'Manage your public profile information')}
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-8">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-primary-soft flex items-center justify-center text-primary text-2xl font-bold overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-sm hover:bg-primary-hover transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('profile.avatar', 'Profile Picture')}
              </h3>
              <p className="text-xs text-secondary mb-3">
                {t('profile.avatar_hint', 'JPG, GIF or PNG. Max size of 800K')}
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label={t('profile.name', 'Display Name')}
              defaultValue={user?.name || ''}
              placeholder="Enter your name"
            />
            <Input
              label={t('profile.email', 'Email Address')}
              defaultValue={user?.email || ''}
              disabled
              className="bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
            />
            <div className="md:col-span-2">
              <label className="block text-base font-medium text-secondary mb-1">
                {t('profile.bio', 'Bio')}
              </label>
              <textarea
                className="input-base h-24 py-3 resize-none"
                placeholder={t('profile.bio_placeholder', 'Tell us about yourself')}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-base">
            <Button>
              {t('button.save_changes', 'Save Changes', { ns: 'common' })}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
