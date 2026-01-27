'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/hooks';
import { Lock, Trash2 } from 'lucide-react';

export function AccountSettings() {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          {t('account.title', 'Account Security')}
        </h2>
        <p className="text-secondary text-sm">
          {t('account.description', 'Manage your account security and preferences')}
        </p>
      </div>

      <Card className="space-y-8">
        {/* Password Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('account.password', 'Change Password')}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4 max-w-xl">
            <Input
              type="password"
              label={t('account.current_password', 'Current Password')}
              placeholder="••••••••"
            />
            <Input
              type="password"
              label={t('account.new_password', 'New Password')}
              placeholder="••••••••"
            />
            <Input
              type="password"
              label={t('account.confirm_password', 'Confirm New Password')}
              placeholder="••••••••"
            />
          </div>

          <div className="mt-4">
            <Button variant="outline">
              {t('account.update_password', 'Update Password')}
            </Button>
          </div>
        </div>

        <div className="border-t border-base my-6" />

        {/* Delete Account */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trash2 className="w-5 h-5 text-error" />
            <h3 className="text-lg font-semibold text-error">
              {t('account.danger_zone', 'Danger Zone')}
            </h3>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('account.delete_account', 'Delete Account')}
              </p>
              <p className="text-xs text-secondary mt-1">
                {t('account.delete_warning', 'Permanently remove your account and all of its data.')}
              </p>
            </div>
            <Button variant="ghost" className="text-error hover:bg-red-100 hover:text-error dark:hover:bg-red-900/30">
              {t('account.delete_confirm', 'Delete Account')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
