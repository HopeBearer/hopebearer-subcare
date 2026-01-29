'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n/hooks';
import { useAuthStore } from '@/store';
import { userService } from '@/services';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';

const CURRENCY_OPTIONS = [
  { label: 'CNY (¥)', value: 'CNY' },
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'JPY (¥)', value: 'JPY' },
  { label: 'GBP (£)', value: 'GBP' },
  { label: 'HKD ($)', value: 'HKD' },
  { label: 'TWD (NT$)', value: 'TWD' },
];

export function PreferencesSettings() {
  const { t } = useTranslation(['settings', 'common']);
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState(user?.currency || 'CNY');
  const [budget, setBudget] = useState(user?.monthlyBudget || '');

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await userService.updateProfile({ 
        currency, 
        monthlyBudget: Number(budget) 
      });
      if (res.status === 'success') {
        updateUser(res.data.user);
        toast.success(t('messages.preferences_updated', 'Preferences updated successfully'));
      }
    } catch (error) {
      console.error(error);
      toast.error(t('messages.update_failed', 'Failed to update preferences'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          {t('preferences.title', 'Preferences')}
        </h2>
        <p className="text-secondary text-sm">
          {t('preferences.description', 'Manage your display and regional preferences')}
        </p>
      </div>

      <Card className="p-6 space-y-8">
        <div>
           <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('preferences.financial', 'Financial Settings')}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Select
                label={t('preferences.currency', 'Default Currency')}
                value={currency}
                onChange={setCurrency}
                options={CURRENCY_OPTIONS}
             />

             <Input 
                label={t('preferences.monthly_budget', 'Monthly Budget Target')}
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
             />
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? t('button.saving', 'Saving...', { ns: 'common' }) : t('button.save_changes', 'Save Changes', { ns: 'common' })}
            </Button>
        </div>
      </Card>
    </div>
  );
}
