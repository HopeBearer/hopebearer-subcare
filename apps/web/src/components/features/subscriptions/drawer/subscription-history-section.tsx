import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services/subscription.service';
import { useTranslation } from '@/lib/i18n/hooks';
import { Loader2, History, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentRecordDTO } from '@subcare/types';
import { cn } from '@/lib/utils';
import { SubscriptionHistoryModal } from './subscription-history-modal';

interface SubscriptionHistorySectionProps {
  subscriptionId: string;
  currency: string;
  subscriptionName: string;
}

export function SubscriptionHistorySection({ subscriptionId, currency, subscriptionName }: SubscriptionHistorySectionProps) {
  const { t } = useTranslation(['subscription', 'common']);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: historyData, isLoading, error } = useQuery({
    queryKey: ['subscription-history', subscriptionId],
    queryFn: () => subscriptionService.getHistory(subscriptionId, { limit: 5 }), // Only fetch recent 5 for drawer
  });

  const history = historyData?.items || [];
  const total = historyData?.pagination?.total || 0;

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-500 text-sm">
        {t('history_error', { defaultValue: 'Failed to load history' })}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center p-4 text-zinc-400 text-sm">
        {t('history_empty', { defaultValue: 'No history available' })}
      </div>
    );
  }

  // Use the items directly, we already limited to 5 in query
  const recentHistory = history;
  const hasMore = total > 5;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <History className="w-4 h-4" />
            {t('history_title', { defaultValue: 'Subscription History' })}
          </h3>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            {t('view_all_history', { defaultValue: 'View All History' })}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {recentHistory.map((record: PaymentRecordDTO) => (
            <div 
              key={record.id} 
              className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                  {format(new Date(record.billingDate), 'yyyy-MM-dd')}
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full w-fit",
                  getStatusColor(record.status)
                )}>
                  {t(`status.${record.status}`, { defaultValue: record.status })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(Number(record.amount), currency)}
                </span>
                {record.note && (
                  <p className="text-xs text-zinc-500 mt-1 max-w-[150px] truncate">
                    {record.note}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          {hasMore && (
            <div className="text-center pt-1">
               <button 
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
               >
                 {t('and_more_records', { count: total - 5, defaultValue: `+ ${total - 5} more records` })}
               </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && createPortal(
        <SubscriptionHistoryModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          subscriptionId={subscriptionId}
          subscriptionName={subscriptionName}
          currency={currency}
        />,
        document.body
      )}
    </>
  );
}

function getStatusColor(status: string) {
  switch (status.toUpperCase()) {
    case 'PAID':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'FAILED':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
  }
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (e) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
