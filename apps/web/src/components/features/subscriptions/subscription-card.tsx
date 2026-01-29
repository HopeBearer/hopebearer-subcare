'use client';

import { cn } from '@/lib/utils';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { getCategoryColor } from '@/lib/category-colors';
import { SubscriptionDTO } from '@subcare/types';
import { ActionDropdown, ActionItem } from '@/components/ui/action-dropdown';
import { useModalStore } from '@/store/modal.store';
import { subscriptionService } from '@/services/subscription.service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Map backend DTO to frontend display needs if strictly necessary, 
// but try to use SubscriptionDTO directly where possible.
// For backward compatibility or specific UI needs, we can extend or alias it.
export type Subscription = SubscriptionDTO;

interface SubscriptionCardProps {
  subscription: Subscription;
  onClick?: (id: string) => void;
  readonly?: boolean;
}

export function SubscriptionCard({ subscription, onClick, readonly }: SubscriptionCardProps) {
  const { t } = useTranslation(['subscription', 'common']);
  const { openAddSubscription } = useModalStore();
  const queryClient = useQueryClient();
  
  // Normalize status for display logic if backend uses different casing
  const statusKey = subscription.status; // e.g., 'ACTIVE', 'Active'
  
  const statusColors: Record<string, string> = {
    'Active': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'ACTIVE': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'Paused': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    'PAUSED': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    'Renewal Soon': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', // Backend might not have this state directly
  };

  const categoryColor = getCategoryColor(subscription.category);

  const handleEdit = () => {
    openAddSubscription(subscription);
  };

  const handleDelete = async () => {
    if (window.confirm(t('confirm_delete', { defaultValue: 'Are you sure you want to delete this subscription?' }))) {
      try {
        await subscriptionService.delete(subscription.id);
        toast.success(t('deleted_success', { defaultValue: 'Subscription deleted successfully' }));
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      } catch (error) {
        console.error('Failed to delete subscription:', error);
        toast.error(t('delete_failed', { defaultValue: 'Failed to delete subscription' }));
      }
    }
  };

  const actionItems: ActionItem[] = [
    {
      label: t('edit', { defaultValue: 'Edit', ns: 'common' }),
      icon: Edit,
      onClick: handleEdit,
    },
    {
      label: t('delete', { defaultValue: 'Delete', ns: 'common' }),
      icon: Trash2,
      onClick: handleDelete,
      variant: 'danger',
    },
  ];

  return (
    <div 
      onClick={() => onClick?.(subscription.id)}
      className={cn(
        "group relative bg-white dark:bg-gray-800 rounded-[16px] p-6 cursor-pointer",
        "border border-gray-100 dark:border-gray-700 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:shadow-md hover:-translate-y-1 hover:border-lavender/30 dark:hover:border-lavender/30"
      )}
    >
      {/* Header Row: Icon + Title + Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
          <div className="w-10 h-10 rounded-xl bg-lavender/10 dark:bg-lavender/20 flex items-center justify-center text-lavender font-bold text-lg shrink-0">
            {/* Placeholder Logo Logic */}
            {subscription.icon ? (
              <img src={subscription.icon} alt={subscription.name} className="w-6 h-6 object-contain" />
            ) : (
              subscription.name.charAt(0).toUpperCase()
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg leading-tight group-hover:text-lavender transition-colors truncate" title={subscription.name}>
            {subscription.name}
          </h3>
        </div>
        
        {/* Action Menu */}
        {!readonly && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
            <ActionDropdown items={actionItems} />
          </div>
        )}
      </div>

      {/* Tags Block - Independent */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Pending Bill Indicator */}
          {(subscription as any).hasPendingBill && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
              {t('status.pending_payment', { defaultValue: 'Pending Payment' })}
            </span>
          )}
          
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            statusColors[statusKey] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          )}>
            {t(`status.${statusKey}`, { defaultValue: statusKey })}
          </span>
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${categoryColor}20`, 
              color: categoryColor 
            }}
          >
            {t(`categories.${subscription.category.toLowerCase()}`, { defaultValue: subscription.category })}
          </span>
          {subscription.usage && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
              {t(`usage_options.${subscription.usage}`, { defaultValue: subscription.usage })}
            </span>
          )}
      </div>

      {/* Description */}
      {subscription.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2">
          {subscription.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50 dark:border-gray-700/50">
        <div className="flex flex-col">
           <span className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
             {t('cost')}
           </span>
            <div className="flex items-baseline gap-1">
             <span className="text-xl font-bold text-gray-900 dark:text-white">
               {subscription.currency} {subscription.price}
             </span>
             <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
               /{t(`cycle_options.${subscription.billingCycle}`, { defaultValue: subscription.billingCycle })}
             </span>
           </div>
        </div>

        <div className="flex flex-col items-end">
           <span className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
             {t('next_bill')}
           </span>
           <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 font-medium bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md">
             <Calendar className="w-3.5 h-3.5 text-gray-400" />
             {subscription.nextPayment ? new Date(subscription.nextPayment).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
           </div>
        </div>
      </div>
    </div>
  );
}
