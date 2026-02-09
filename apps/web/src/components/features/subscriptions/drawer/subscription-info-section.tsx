'use client';

import { Subscription } from './types';
import { Tag, CreditCard, Calendar, Clock, RefreshCw, ExternalLink, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubscriptionInfoSectionProps {
  subscription: Subscription;
}

export function SubscriptionInfoSection({ subscription }: SubscriptionInfoSectionProps) {
  const { t, i18n } = useTranslation(['subscription', 'common']);

  const startDate = new Date(subscription.startDate).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' });

  const isExpired = subscription.status === 'Expired' || subscription.status === 'EXPIRED';

  // Use nextPayment directly from DB as expiry date for non-autoRenewal subscriptions
  const expiryDateValue = isExpired && !subscription.nextPayment
    ? t('status.Expired', { defaultValue: 'Expired' })
    : subscription.nextPayment
      ? new Date(subscription.nextPayment).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })
      : null;

  const fields: { label: string; value: string | null | undefined; icon: typeof Tag; highlight?: boolean }[] = [
    { 
      label: t('category', { defaultValue: 'Category' }), 
      value: t(`categories.${subscription.category.toLowerCase()}`, { defaultValue: subscription.category }), 
      icon: Tag 
    },
    { 
      label: t('payment_method', { defaultValue: 'Payment Method' }), 
      value: subscription.paymentMethod,
      icon: CreditCard 
    },
    { 
      label: t('start_date', { defaultValue: 'Start Date' }), 
      value: startDate, 
      icon: Calendar 
    },
    { 
      label: t('auto_renewal', { defaultValue: 'Auto Renewal' }), 
      value: subscription.autoRenewal 
        ? t('on', { defaultValue: 'On' }) 
        : t('auto_renewal_off_label', { defaultValue: 'Off - No future renewal' }), 
      icon: RefreshCw,
      highlight: !subscription.autoRenewal
    },
    // Show expiry date when autoRenewal is off
    ...(!subscription.autoRenewal ? [{
      label: t('expiry_date', { defaultValue: 'Expiry Date' }),
      value: expiryDateValue,
      icon: Clock,
      highlight: true
    }] : []),
  ];

  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
        {t('details', { defaultValue: 'Details' })}
      </h3>
      
      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
        {fields.map((field) => (
          <div key={field.label} className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <field.icon className="w-3 h-3 opacity-70" />
              {field.label}
            </span>
            <span className={`text-sm font-medium truncate ${field.highlight ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-200'}`}>
              {field.value || '-'}
            </span>
          </div>
        ))}

        {subscription.website && (
          <div className="col-span-2 flex flex-col gap-1">
            <span className="text-xs text-zinc-500">{t('website', { defaultValue: 'Website' })}</span>
            <a 
              href={subscription.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-lavender hover:text-lavender-hover hover:underline flex items-center gap-1 w-fit"
            >
              {subscription.website.replace(/^https?:\/\//, '')}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {subscription.historicalSpending != null && Number(subscription.historicalSpending) > 0 && (
          <div className="col-span-2 flex flex-col gap-1.5 mt-2 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200/40 dark:border-amber-800/30">
            <span className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <History className="w-3 h-3 opacity-70" />
              {t('historical_spending_display', { defaultValue: 'Historical Spending (Self-reported)' })}
            </span>
            <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {subscription.currency} {Number(subscription.historicalSpending).toFixed(2)}
            </span>
            {subscription.historicalNote && (
              <span className="text-xs text-amber-600/80 dark:text-amber-400/60">
                {subscription.historicalNote}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
