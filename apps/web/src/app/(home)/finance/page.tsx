'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n/hooks';
import { subscriptionService } from '@/services/subscription.service';
import { financialService } from '@/services/financial.service';
import { useSpendingHeatmap, useProjection, useAnomalies, useSankeyData, useFinancialSummary } from '@/hooks/use-analytics';
import { SpendingHeatmap } from '@/components/features/finance/big-picture/spending-heatmap';
import { ProjectionChart } from '@/components/features/finance/projection/projection-chart';
import { SubscriptionSimulator } from '@/components/features/finance/projection/subscription-simulator';
import { TransactionHistoryTable } from '@/components/features/finance/history/transaction-history-table';
import { PriceChangeTimeline } from '@/components/features/finance/anomalies/price-change-timeline';
import { SpendingSankey } from '@/components/features/finance/classification/spending-sankey';
import { Card } from '@/components/ui/card';

export default function FinancePage() {
  const { t } = useTranslation('finance');
  const [historyPage, setHistoryPage] = useState(1);
  
  // --- Analytics Data ---
  const { data: heatmapData, isLoading: heatmapLoading } = useSpendingHeatmap(new Date().getFullYear());
  const { data: anomalies, isLoading: anomaliesLoading } = useAnomalies();
  const { data: sankeyData, isLoading: sankeyLoading } = useSankeyData();
  const { data: summary, isLoading: summaryLoading } = useFinancialSummary();
  
  const { data: subsData } = useQuery({ 
    queryKey: ['subscriptions', 'all'], 
    queryFn: () => subscriptionService.getAll({ limit: 100 }) 
  });
  
  const subscriptions = subsData?.subscriptions || [];
  
  // Projection Logic
  const { projection, excludedIds, toggleSubscription } = useProjection(subscriptions);

  // --- History Data ---
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['financial-history', historyPage],
    queryFn: () => financialService.getHistory(historyPage, 10)
  });

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Module A: Big Picture (Spending Overview) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-base-content flex items-center gap-2">
          {t('section.big_picture')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
          <div className="lg:col-span-2 h-full">
            <SpendingHeatmap data={heatmapData || []} isLoading={heatmapLoading} className="h-full" />
          </div>
          <div className="lg:col-span-1 h-full">
             {/* Summary / Currency Impact Card */}
             <Card className="h-full p-6 flex flex-col justify-center items-center text-center space-y-4 bg-gradient-to-br from-primary/5 to-transparent border-base bg-surface">
                <div className="grid grid-cols-1 gap-6 w-full">
                    <div>
                        <div className="p-2 bg-primary/10 rounded-full text-primary w-fit mx-auto mb-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-base-content">
                            {summaryLoading ? '...' : `${summary.currency} ${summary.totalExpense}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">{t('ytd_expense_actual')}</p>
                    </div>
                    <div className="border-t border-border pt-4">
                         <div className="p-2 bg-purple-500/10 rounded-full text-purple-500 w-fit mx-auto mb-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-base-content">
                           {summaryLoading ? '...' : `${summary.currency} ${summary.projectedTotal}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">{t('projected_annual_total')}</p>
                    </div>
                </div>
             </Card>
          </div>
        </div>
      </section>

      {/* Module C: Projection & Simulation */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-base-content flex items-center gap-2">
           {t('section.projection')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-full">
            <ProjectionChart data={projection} />
          </div>
          <div className="lg:col-span-1 h-full">
            <SubscriptionSimulator 
              subscriptions={subscriptions}
              excludedIds={excludedIds}
              onToggle={toggleSubscription}
            />
          </div>
        </div>
      </section>

      {/* Module B & Module D */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Module B: Anomalies */}
         <div className="h-full flex flex-col">
             <PriceChangeTimeline 
                anomalies={anomalies || []}
                isLoading={anomaliesLoading}
             />
         </div>
         
         {/* Module D: Sankey Flow */}
         <div className="h-full flex flex-col">
             <SpendingSankey 
                data={sankeyData}
                isLoading={sankeyLoading}
             />
         </div>
      </section>

      {/* Module E: Transaction History */}
      <section className="space-y-4">
        <TransactionHistoryTable 
            items={historyData?.items || []} 
            isLoading={isHistoryLoading}
            pagination={{
                page: historyData?.pagination.page || 1,
                totalPages: historyData?.pagination.totalPages || 1,
                total: historyData?.pagination.total || 0
            }}
            onPageChange={setHistoryPage}
        />
      </section>
    </div>
  );
}
