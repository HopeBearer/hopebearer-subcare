'use client';

import { Subscription } from './types';
import { Trash2, Play, Pause, Pencil, XCircle, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { subscriptionService } from '@/services';
import { useModalStore } from '@/store';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SubscriptionActionBarProps {
  subscription: Subscription;
  onClose: () => void;
}

export function SubscriptionActionBar({ subscription, onClose }: SubscriptionActionBarProps) {
  const { t } = useTranslation(['subscription', 'common']);
  const { openAddSubscription } = useModalStore();
  const queryClient = useQueryClient();

  const isPaused = subscription.status === 'PAUSED' || subscription.status === 'Paused';

  const handleStatusChange = async (newStatus: 'ACTIVE' | 'PAUSED' | 'CANCELLED') => {
    try {
      await subscriptionService.update(subscription.id, { 
        // @ts-ignore: DTO might not strictly match Partial<CreateSubscriptionDTO> perfectly for status updates if separate endpoint exists
        status: newStatus 
      });
      toast.success(t('update_success', { defaultValue: 'Subscription updated successfully' }));
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    } catch (error) {
      console.error('Failed to update subscription status:', error);
      toast.error(t('update_failed', { defaultValue: 'Failed to update subscription' }));
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('confirm_delete', { defaultValue: 'Are you sure you want to delete this subscription?' }))) {
      try {
        await subscriptionService.delete(subscription.id);
        toast.success(t('deleted_success', { defaultValue: 'Subscription deleted successfully' }));
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        onClose();
      } catch (error) {
        console.error('Failed to delete subscription:', error);
        toast.error(t('delete_failed', { defaultValue: 'Failed to delete subscription' }));
      }
    }
  };

  const handleEdit = () => {
    openAddSubscription(subscription);
  };

  const actionButtons = [
    {
      icon: Trash2,
      label: t('delete', { defaultValue: 'Delete', ns: 'common' }),
      onClick: handleDelete,
      className: "hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
      show: true
    },
    {
      icon: isPaused ? Play : Pause,
      label: isPaused ? t('resume', { defaultValue: 'Resume' }) : t('pause', { defaultValue: 'Pause' }),
      onClick: () => handleStatusChange(isPaused ? 'ACTIVE' : 'PAUSED'),
      className: "hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20",
      show: subscription.status !== 'CANCELLED' && subscription.status !== 'Cancelled'
    },
    {
      icon: XCircle,
      label: t('unsubscribe', { defaultValue: 'Unsubscribe' }),
      onClick: () => handleStatusChange('CANCELLED'),
      className: "hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20",
      show: subscription.status === 'ACTIVE' || subscription.status === 'Active'
    }
  ];

  return (
    <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 p-4 pb-8 flex items-center justify-between gap-3 z-10">
      <div className="flex gap-2 items-center">
        {actionButtons.map((btn, index) => btn.show && (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className={cn(
                    "p-2 text-zinc-400 rounded-lg transition-colors group relative",
                    btn.className
                  )}
                  onClick={btn.onClick}
                >
                  <btn.icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{btn.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="p-2 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400 rounded-lg transition-colors cursor-help"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-3">
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Trash2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{t('help_delete', { defaultValue: 'Permanently remove this subscription record.' })}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Pause className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{t('help_pause', { defaultValue: 'Temporarily stop tracking without deleting data.' })}</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{t('help_unsubscribe', { defaultValue: 'Mark as cancelled but keep history.' })}</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex gap-3">
        <button 
          className="px-6 py-2 text-sm font-medium text-white bg-lavender hover:bg-lavender-hover active:bg-lavender-active rounded-lg shadow-sm shadow-lavender/30 transition-all flex items-center gap-2"
          onClick={handleEdit}
        >
          <Pencil className="w-4 h-4" />
          {t('edit', { defaultValue: 'Edit', ns: 'common' })}
        </button>
      </div>
    </div>
  );
}
