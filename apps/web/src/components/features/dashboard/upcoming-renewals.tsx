'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/hooks';
import { Calendar, Bell, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { subscriptionService } from '@/services/subscription.service';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays } from 'date-fns';

export function UpcomingRenewals() {
  const { t } = useTranslation();

  const { data: renewals = [], isLoading: loading } = useQuery({
    queryKey: ['subscriptions', 'upcoming'],
    queryFn: () => subscriptionService.getUpcomingRenewals(7),
  });

  if (loading) {
    return (
      <Card className="p-6 mt-8 w-full bg-surface animate-pulse">
        <div className="h-7 w-48 bg-gray-200 rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full bg-gray-100 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mt-8 w-full bg-surface dark:bg-gray-800 border border-base shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('dashboard:upcoming.title', 'Upcoming Renewals')}
          </h2>
        </div>
        <Link href="/subscriptions?expiringIn=7">
          <Button 
             variant="ghost" 
             className={cn(
               'flex items-center gap-2 px-3 py-2 h-auto rounded-xl transition-all duration-200 ease group',
               'bg-transparent hover:bg-primary-pale dark:hover:bg-white/5',
               'text-secondary dark:text-gray-400'
             )}
          >
             <span className="text-sm font-medium transition-colors group-hover:text-primary">
               {t('dashboard:upcoming.view_all', 'View All')}
             </span>
             <ArrowRight className="w-4 h-4 transition-colors group-hover:text-primary" />
          </Button>
        </Link>
      </div>

      {renewals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-900 font-medium mb-1">
            {t('dashboard:upcoming.empty_title', 'No upcoming renewals')}
          </h3>
          <p className="text-sm text-gray-500 max-w-xs">
            {t('dashboard:upcoming.empty_desc', 'You have no subscriptions due for renewal in the next 7 days.', { days: 7 })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {renewals.slice(0, 5).map((sub) => {
            const nextPayment = sub.nextPayment ? new Date(sub.nextPayment) : new Date();
            const daysLeft = differenceInCalendarDays(nextPayment, new Date());
            const isUrgent = daysLeft <= 3;

            return (
              <div
                key={sub.id}
                className={cn(
                  "relative group flex items-center justify-between p-4 rounded-2xl border w-full",
                  "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  "hover:-translate-y-[5px]",
                  isUrgent 
                    ? cn(
                        "bg-red-50/30 border-red-100 dark:bg-red-900/10 dark:border-red-800/30",
                        "hover:shadow-[0_8px_30px_rgba(239,68,68,0.1)] dark:hover:shadow-[0_8px_30px_rgba(239,68,68,0.2)]",
                        "hover:border-red-200 dark:hover:border-red-700"
                      )
                    : cn(
                        "bg-white dark:bg-gray-800/40",
                        "border-[rgba(165,166,246,0.15)] dark:border-[rgba(165,166,246,0.1)]",
                        "shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]",
                        "hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]",
                        "hover:border-[#A5A6F6]"
                      )
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0",
                    isUrgent ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                  )}>
                    {sub.icon ? (
                      <img src={sub.icon} alt={sub.name} className="w-7 h-7 object-contain" />
                    ) : (
                      sub.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  
                  {/* Name & Category */}
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                      {sub.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                      {sub.category ? t(`subscription:categories.${sub.category.toLowerCase()}`, sub.category) : t('common:category.other', 'Other')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Price info */}
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-gray-900 dark:text-white text-base">
                      {sub.currency} {Number(sub.price).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
                       {sub.billingCycle ? t(`subscription:cycle_options.${sub.billingCycle}`, sub.billingCycle) : sub.billingCycle}
                    </span>
                  </div>

                  {/* Days Left Badge and Date */}
                  <div className="flex flex-col items-end gap-1">
                    <div className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap min-w-[80px] text-center",
                      isUrgent 
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" 
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    )}>
                      {daysLeft <= 0 
                        ? t('dashboard:upcoming.today', 'Today')
                        : t('dashboard:upcoming.days_left', '{{days}} days', { days: daysLeft })
                      }
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                      {nextPayment.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
