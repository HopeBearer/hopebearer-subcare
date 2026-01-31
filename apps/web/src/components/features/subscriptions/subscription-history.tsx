'use client';

import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SubscriptionHistoryProps {
  subscriptionId: string;
}

export function SubscriptionHistory({ subscriptionId }: SubscriptionHistoryProps) {
  const { t } = useTranslation(['finance', 'common']);
  
  const { data: history, isLoading } = useQuery({
    queryKey: ['subscription-history', subscriptionId],
    queryFn: () => subscriptionService.getHistory(subscriptionId)
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!history || !history.items || history.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400">
        <p className="text-sm">{t('no_data', { ns: 'finance', defaultValue: 'No history available' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 font-medium">
            <tr>
              <th className="px-4 py-3">{t('table.date', { ns: 'finance' })}</th>
              <th className="px-4 py-3">{t('table.amount', { ns: 'finance' })}</th>
              <th className="px-4 py-3">{t('table.status', { ns: 'finance' })}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {history.items.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {format(new Date(record.billingDate), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {record.currency} {Number(record.amount).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide",
                    record.status === 'PAID' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  )}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
