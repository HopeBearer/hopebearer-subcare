'use client';

import { useModalStore } from '@/store/modal.store';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from '@/lib/i18n/hooks';
import { AddSubscriptionStepForm } from './add-subscription-step-form';
import { subscriptionService } from '@/services/subscription.service';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function AddSubscriptionModal() {
  const { isAddSubscriptionOpen, closeAddSubscription } = useModalStore();
  const { t } = useTranslation(['subscription']);
  const queryClient = useQueryClient();

  const handleSubmit = async (data: any) => {
    try {
      await subscriptionService.create(data);
      toast.success(t('created_success', { ns: 'subscription', defaultValue: 'Subscription created successfully' }));
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      
      closeAddSubscription();
    } catch (error) {
      console.error('Failed to create subscription:', error);
      // Error handling is managed by the API interceptor mostly, but we can add specific logic here if needed
    }
  };

  return (
    <Modal
      isOpen={isAddSubscriptionOpen}
      onClose={closeAddSubscription}
      title={t('add', { ns: 'subscription' })}
      className="max-w-2xl p-0 overflow-hidden" // Increase width for better step form layout
      headerClassName="px-6 pt-6"
    >
      <AddSubscriptionStepForm 
        onCancel={closeAddSubscription}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}
