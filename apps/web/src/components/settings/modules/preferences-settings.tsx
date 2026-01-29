'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from '@/lib/i18n/hooks';
import { useAuthStore } from '@/store';
import { userService, financialService } from '@/services';
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
  const [budget, setBudget] = useState<string | number>(user?.monthlyBudget || '');
  
  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [convertedBudget, setConvertedBudget] = useState<number>(0);
  const [targetCurrency, setTargetCurrency] = useState<string>('');

  const executeUpdate = async (finalBudget: number) => {
    setLoading(true);
    try {
      const res = await userService.updateProfile({ 
        currency: targetCurrency || currency, 
        monthlyBudget: finalBudget
      });
      if (res.status === 'success') {
        updateUser(res.data.user);
        toast.success(t('messages.preferences_updated', 'Preferences updated successfully'));
        
        // Update local state to match saved values
        if (res.data.user.currency) {
          setCurrency(res.data.user.currency);
        }
        if (res.data.user.monthlyBudget !== undefined) {
          setBudget(res.data.user.monthlyBudget);
        }
        setShowConfirmModal(false);
      }
    } catch (error) {
      console.error(error);
      toast.error(t('messages.update_failed', 'Failed to update preferences'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // 1. Check if currency changed
    const oldCurrency = user?.currency || 'CNY';
    const oldBudget = Number(user?.monthlyBudget || 0);
    const currentBudget = Number(budget);

    // Case 1: Currency didn't change -> Standard Save
    if (currency === oldCurrency) {
      await executeUpdate(currentBudget);
      return;
    }

    // Case 2: Currency changed AND Budget changed -> User Intent Explicit -> Standard Save
    if (currentBudget !== oldBudget) {
      await executeUpdate(currentBudget);
      return;
    }

    // Case 3: Currency changed BUT Budget is same -> Ambiguous Intent -> Trigger Confirmation
    setLoading(true);
    try {
      // Fetch preview from backend
      const preview = await financialService.previewConversion(oldBudget, oldCurrency, currency);
      setConvertedBudget(preview.amount);
      setTargetCurrency(currency);
      setShowConfirmModal(true);
    } catch (error) {
      console.error("Failed to get preview", error);
      // Fallback: just save what we have if preview fails
      await executeUpdate(currentBudget);
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

      <Card className="p-6 space-y-6">
        <div>
           <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('preferences.financial', 'Financial Settings')}
                </h3>
            </div>
             <Button onClick={handleSave} disabled={loading} className="px-4 py-2 text-sm">
              {loading ? t('button.saving', 'Saving...', { ns: 'common' }) : t('button.save_changes', 'Save Changes', { ns: 'common' })}
            </Button>
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
      </Card>

      <Modal 
        isOpen={showConfirmModal} 
        onClose={() => setShowConfirmModal(false)}
        title={t('preferences.currency_change_title', 'Currency Changed')}
      >
          <div className="py-4 space-y-4">
             <p className="text-gray-600 dark:text-gray-300">
                {t('preferences.currency_change_desc', 'You changed the currency but kept the budget amount the same. Do you want to convert the budget amount or keep it as is?')}
             </p>

             <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('preferences.keep_value', 'Keep Value')}</span>
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{targetCurrency} {budget}</span>
             </div>
             <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex justify-between items-center">
                <span className="text-sm text-primary font-medium">{t('preferences.convert_value', 'Convert (Recommended)')}</span>
                <span className="font-mono font-bold text-primary">{targetCurrency} {convertedBudget}</span>
             </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => executeUpdate(Number(budget))}>
              {t('preferences.use_original', 'Keep {{amount}}', { amount: budget })}
            </Button>
            <Button onClick={() => executeUpdate(convertedBudget)}>
              {t('preferences.use_converted', 'Use {{amount}}', { amount: convertedBudget })}
            </Button>
          </div>
      </Modal>
    </div>
  );
}
