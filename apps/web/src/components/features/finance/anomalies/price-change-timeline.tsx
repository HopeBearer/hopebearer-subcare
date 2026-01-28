'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { SpendingAnomaly } from '@subcare/types';
import { AlertCircle, TrendingUp, Copy, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PriceChangeTimelineProps {
  anomalies: SpendingAnomaly[];
  isLoading?: boolean;
}

export const PriceChangeTimeline = ({ anomalies, isLoading }: PriceChangeTimelineProps) => {
  const { t } = useTranslation('finance');

  if (isLoading) {
    return (
      <Card className="h-full p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </Card>
    );
  }

  const getIcon = (type: SpendingAnomaly['type']) => {
    switch (type) {
      case 'PRICE_INCREASE':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'DUPLICATE':
        return <Copy className="h-4 w-4 text-red-500" />;
      case 'ABNORMAL_FREQUENCY':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: SpendingAnomaly['severity']) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900';
      case 'medium':
        return 'border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900';
      case 'low':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900';
      default:
        return 'border-base';
    }
  };

  return (
    <Card className="h-full p-6 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          {t('anomalies.title')}
        </h3>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
          {anomalies.length} {t('anomalies.detected')}
        </span>
      </div>

      <div className="relative pl-4 border-l border-base space-y-8 flex-1 overflow-y-auto">
        {anomalies.map((item, index) => (
          <div key={item.id} className="relative group">
            {/* Timeline dot */}
            <div className={cn(
              "absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2 bg-surface transition-colors duration-300",
              item.severity === 'high' ? "border-red-500 group-hover:bg-red-500" : 
              item.severity === 'medium' ? "border-orange-500 group-hover:bg-orange-500" : "border-blue-500 group-hover:bg-blue-500"
            )} />
            
            <div className={cn(
              "p-3 rounded-lg border transition-all duration-300 hover:shadow-sm",
              getSeverityColor(item.severity)
            )}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                   <div className="p-1 rounded bg-surface shadow-sm">
                     {getIcon(item.type)}
                   </div>
                   <span className="font-semibold text-sm text-base-content">
                     {item.subscriptionName}
                   </span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {format(new Date(item.date), 'yyyy-MM-dd')}
                </span>
              </div>
              
              <p className="text-sm text-base-content/80 mt-1">
                {item.description}
              </p>
              
              {item.type === 'PRICE_INCREASE' && item.metadata.oldPrice && (
                 <div className="mt-2 text-xs flex items-center gap-2 text-muted-foreground">
                    <span className="line-through">{item.metadata.currency} {item.metadata.oldPrice}</span>
                    <span className="text-orange-600 dark:text-orange-400 font-bold">
                        → {item.metadata.currency} {item.metadata.newPrice}
                    </span>
                 </div>
              )}
            </div>
          </div>
        ))}
        
        {anomalies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
                {t('anomalies.empty')}
            </div>
        )}
      </div>
    </Card>
  );
};
