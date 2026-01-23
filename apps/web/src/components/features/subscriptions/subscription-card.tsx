'use client';

import { cn } from '@/lib/utils';
import { Calendar, MoreVertical } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { getCategoryColor } from '@/lib/category-colors';
import { SubscriptionDTO } from '@subcare/types';

// Map backend DTO to frontend display needs if strictly necessary, 
// but try to use SubscriptionDTO directly where possible.
// For backward compatibility or specific UI needs, we can extend or alias it.
export type Subscription = SubscriptionDTO;

interface SubscriptionCardProps {
  subscription: Subscription;
  onClick?: (id: string) => void;
}

export function SubscriptionCard({ subscription, onClick }: SubscriptionCardProps) {
  const { t } = useTranslation('subscription');
  
  // Normalize status for display logic if backend uses different casing
  const statusKey = subscription.status; // e.g., 'ACTIVE', 'Active'
  
  const statusColors: Record<string, string> = {
    'Active': 'bg-green-100 text-green-700',
    'ACTIVE': 'bg-green-100 text-green-700',
    'Paused': 'bg-gray-100 text-gray-700',
    'PAUSED': 'bg-gray-100 text-gray-700',
    'Renewal Soon': 'bg-orange-100 text-orange-700', // Backend might not have this state directly
  };

  const categoryColor = getCategoryColor(subscription.category);

  return (
    <div 
      onClick={() => onClick?.(subscription.id)}
      className={cn(
        "group relative bg-white rounded-[16px] p-6 cursor-pointer",
        "border border-gray-100 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:shadow-md hover:-translate-y-1 hover:border-lavender/30"
      )}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4 flex-1 min-w-0 pr-2">
          <div className="w-12 h-12 rounded-xl bg-lavender/10 flex items-center justify-center text-lavender font-bold text-xl shrink-0">
            {/* Placeholder Logo Logic */}
            {subscription.icon ? (
              <img src={subscription.icon} alt={subscription.name} className="w-8 h-8 object-contain" />
            ) : (
              subscription.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight group-hover:text-lavender transition-colors truncate" title={subscription.name}>
              {subscription.name}
            </h3>
            <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                statusColors[statusKey] || 'bg-gray-100 text-gray-700'
              )}>
                {t(`status.${statusKey.toLowerCase()}`, { defaultValue: statusKey })}
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
            </div>
          </div>
        </div>
        
        {/* Optional Action Menu Placeholder */}
        <button className="text-gray-400 hover:text-gray-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
        <div className="flex flex-col">
           <span className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
             {t('cost')}
           </span>
            <div className="flex items-baseline gap-1">
             <span className="text-xl font-bold text-gray-900">
               {subscription.currency} {subscription.price}
             </span>
             <span className="text-xs text-gray-500 font-medium">
               /{t(`cycle_options.${subscription.billingCycle}`, { defaultValue: subscription.billingCycle })}
             </span>
           </div>
        </div>

        <div className="flex flex-col items-end">
           <span className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
             {t('next_bill')}
           </span>
           <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium bg-gray-50 px-2 py-1 rounded-md">
             <Calendar className="w-3.5 h-3.5 text-gray-400" />
             {subscription.nextPayment ? new Date(subscription.nextPayment).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
           </div>
        </div>
      </div>
    </div>
  );
}
