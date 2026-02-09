'use client';

import { Subscription } from './types';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Clock } from 'lucide-react';

interface SubscriptionHeaderProps {
  subscription: Subscription;
}

export function SubscriptionHeader({ subscription }: SubscriptionHeaderProps) {
  const { t, i18n } = useTranslation(['subscription', 'common']);

  // Compute display status: "Expired" with future nextPayment → "Active" (still in coverage)
  const isBackendExpired = subscription.status === 'Expired' || subscription.status === 'EXPIRED';
  const hasExpiryInFuture = isBackendExpired && subscription.nextPayment
    && new Date(subscription.nextPayment).setHours(23,59,59,999) >= new Date().setHours(0,0,0,0);
  const displayStatusKey = hasExpiryInFuture ? 'Active' : subscription.status;
  
  const statusStyles: Record<string, string> = {
    'ACTIVE': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'Active': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'PAUSED': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'Paused': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'CANCELLED': 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
    'Cancelled': 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
    'EXPIRED': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    'Expired': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  const formattedPrice = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: subscription.currency,
    currencyDisplay: 'code',
  }).format(subscription.price);

  const isTrulyExpired = isBackendExpired && !hasExpiryInFuture;
  
  // Use nextPayment directly from DB — no need to recalculate
  const nextPaymentDate = isTrulyExpired && !subscription.nextPayment
    ? t('status.Expired', { defaultValue: 'Expired' })
    : subscription.nextPayment 
      ? new Date(subscription.nextPayment).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' }) 
      : 'N/A';
  
  const dateLabel = subscription.autoRenewal 
    ? t('next_bill') 
    : t('expiry_date', { defaultValue: 'Expiry Date' });

  return (
    <div className="bg-gradient-to-b from-lavender/20 to-transparent dark:from-indigo-900/20 pt-12 pb-6 px-6 border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-3xl border border-zinc-100 dark:border-zinc-700">
            {subscription.icon ? (
              <img src={subscription.icon} alt={subscription.name} className="w-10 h-10 object-contain" />
            ) : (
              <span className="text-lavender font-bold">{subscription.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {subscription.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {(subscription as any).hasPendingBill && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                  {t('status.pending_payment', { defaultValue: 'Pending Payment' })}
                </span>
              )}
              <span 
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  statusStyles[displayStatusKey] || 'bg-gray-100 text-gray-700'
                )}
              >
                {t(`status.${displayStatusKey}`, { defaultValue: displayStatusKey })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-1 mt-6">
        <span className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">
          {formattedPrice}
        </span>
        <span className="text-zinc-500 text-sm font-medium">
          / {t(`cycle_options.${subscription.billingCycle}`, { defaultValue: subscription.billingCycle })}
        </span>
      </div>

      <div className={cn(
        "mt-3 flex items-center gap-2 text-sm",
        !subscription.autoRenewal 
          ? "text-amber-600 dark:text-amber-400" 
          : "text-zinc-500 dark:text-zinc-400"
      )}>
        {subscription.autoRenewal ? <CalendarClock className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
        <span>{dateLabel}: <span className={cn(
          "font-medium",
          !subscription.autoRenewal 
            ? "text-amber-700 dark:text-amber-300" 
            : "text-zinc-900 dark:text-zinc-200"
        )}>{nextPaymentDate}</span></span>
      </div>
    </div>
  );
}
