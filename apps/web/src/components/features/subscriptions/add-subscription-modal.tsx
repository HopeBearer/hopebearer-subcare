'use client';

import { useModalStore } from '@/store';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from '@/lib/i18n/hooks';
import { AddSubscriptionStepForm } from './add-subscription-step-form';
import { SubscriptionHistory } from './subscription-history';
import { subscriptionService } from '@/services';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { History, Edit } from 'lucide-react';

export function AddSubscriptionModal() {
  const { isAddSubscriptionOpen, closeAddSubscription, subscriptionToEdit } = useModalStore();
  const { t } = useTranslation(['subscription', 'finance']);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');

  const handleSubmit = async (data: any) => {
    try {
      if (subscriptionToEdit) {
        await subscriptionService.update(subscriptionToEdit.id, data);
        toast.success(t('updated_success', { ns: 'subscription', defaultValue: 'Subscription updated successfully' }));
      } else {
        await subscriptionService.create(data);
        toast.success(t('created_success', { ns: 'subscription', defaultValue: 'Subscription created successfully' }));
      }
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-names'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pending-bills'] });
      
      closeAddSubscription();
    } catch (error) {
      console.error('Failed to save subscription:', error);
    }
  };
  
  // Reset tab when modal closes/opens
  const handleClose = () => {
    setActiveTab('edit');
    closeAddSubscription();
  };

  return (
    <Modal
      isOpen={isAddSubscriptionOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-4">
           <span>{subscriptionToEdit ? t('edit', { ns: 'subscription' }) : t('add', { ns: 'subscription' })}</span>
           {subscriptionToEdit && (
             <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setActiveTab('edit')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    activeTab === 'edit' ? "bg-white dark:bg-gray-700 shadow text-primary" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                  title={t('edit', { ns: 'subscription' })}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    activeTab === 'history' ? "bg-white dark:bg-gray-700 shadow text-primary" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                  title={t('history', { ns: 'finance' })}
                >
                  <History className="w-4 h-4" />
                </button>
             </div>
           )}
        </div>
      }
      className="max-w-2xl p-0 overflow-hidden"
      headerClassName="px-6 pt-6"
    >
      {activeTab === 'edit' ? (
        <AddSubscriptionStepForm 
          onCancel={handleClose}
          onSubmit={handleSubmit}
          initialValues={subscriptionToEdit}
        />
      ) : (
        <div className="p-6 min-h-[400px]">
           <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">{t('history', { ns: 'finance' })}</h3>
           {subscriptionToEdit && <SubscriptionHistory subscriptionId={subscriptionToEdit.id} />}
           <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setActiveTab('edit')}
                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              >
                Back to Edit
              </button>
           </div>
        </div>
      )}
    </Modal>
  );
}
