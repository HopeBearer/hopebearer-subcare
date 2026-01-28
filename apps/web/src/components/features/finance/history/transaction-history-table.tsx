'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PaymentRecordDTO } from '@subcare/types';

interface TransactionHistoryTableProps {
  items: PaymentRecordDTO[];
  isLoading?: boolean;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange: (page: number) => void;
}

export const TransactionHistoryTable = ({ 
  items, 
  isLoading, 
  pagination, 
  onPageChange 
}: TransactionHistoryTableProps) => {
  const { t } = useTranslation(['finance']); // Keeping 'finance' namespace for history
  
  if (isLoading) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-base bg-surface">
        <div className="p-6 border-b border-base">
          <h2 className="text-lg font-bold text-base-content">
            {t('history', 'Transaction History')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('table.date', 'Date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('table.subscription', 'Subscription')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('table.amount', 'Amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('table.status', 'Status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content/80 font-mono">
                    {format(new Date(item.billingDate), 'yyyy-MM-dd')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                       <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs mr-3">
                          {item.subscription?.name?.charAt(0) || '?'}
                       </div>
                       <div className="text-sm font-medium text-base-content">
                         {item.subscription?.name || 'Unknown'}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-base-content font-mono">
                    {item.currency} {Number(item.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-1 text-xs rounded-full font-medium",
                      item.status === 'PAID' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                    )}>
                      {t(`status.${item.status.toLowerCase()}`, { defaultValue: item.status })}
                    </span>
                  </td>
                </tr>
              ))}
              {(!items || items.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    {t('no_data', 'No transactions found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Simple Pagination */}
        <div className="p-4 border-t border-base flex justify-end gap-2 items-center">
            <button 
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(pagination.page - 1)}
                className="px-3 py-1 text-sm border border-base rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {t('pagination.prev', 'Previous')}
            </button>
            <span className="text-sm text-muted-foreground">
              {t('pagination.page_info', { page: pagination.page, total: pagination.totalPages || 1 }, `Page ${pagination.page} of ${pagination.totalPages || 1}`)}
            </span>
            <button 
                disabled={pagination.page >= (pagination.totalPages || 1)}
                onClick={() => onPageChange(pagination.page + 1)}
                className="px-3 py-1 text-sm border border-base rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {t('pagination.next', 'Next')}
            </button>
        </div>
    </Card>
  );
};
