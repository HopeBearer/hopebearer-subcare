'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { SpendingAnomaly, AnomalyType } from '@subcare/types';
import {
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Copy,
  Calendar,
  XCircle,
  Clock,
  Zap,
  ArrowUpCircle,
  ArrowRightLeft,
  Layers,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PriceChangeTimelineProps {
  anomalies: SpendingAnomaly[];
  isLoading?: boolean;
}

const ICON_MAP: Record<AnomalyType, React.ReactNode> = {
  PRICE_INCREASE: <TrendingUp className="h-4 w-4 text-orange-500" />,
  PRICE_DECREASE: <TrendingDown className="h-4 w-4 text-emerald-500" />,
  DUPLICATE_BILLING: <Copy className="h-4 w-4 text-red-500" />,
  FAILED_PAYMENT: <XCircle className="h-4 w-4 text-red-600" />,
  LONG_PENDING: <Clock className="h-4 w-4 text-amber-500" />,
  SPENDING_SPIKE: <Zap className="h-4 w-4 text-orange-600" />,
  NEW_SPENDING_HIGH: <ArrowUpCircle className="h-4 w-4 text-orange-500" />,
  CURRENCY_CHANGE: <ArrowRightLeft className="h-4 w-4 text-blue-500" />,
  SUBSCRIPTION_OVERLAP: <Layers className="h-4 w-4 text-yellow-600" />,
  BUDGET_EXCEEDED: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

const SEVERITY_STYLES: Record<SpendingAnomaly['severity'], string> = {
  high: 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900',
  medium: 'border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900',
  low: 'border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900',
};

const DOT_STYLES: Record<SpendingAnomaly['severity'], string> = {
  high: 'border-red-500 group-hover:bg-red-500',
  medium: 'border-orange-500 group-hover:bg-orange-500',
  low: 'border-blue-500 group-hover:bg-blue-500',
};

/**
 * Build a localized description from i18n template + metadata.
 * Falls back to the server-side English description if no translation key exists.
 */
function useLocalizedDescription(t: (key: string, options?: Record<string, unknown>) => string) {
  return (item: SpendingAnomaly): string => {
    const key = `anomalies.descriptions.${item.type.toLowerCase()}`;
    const data: Record<string, unknown> = { ...item.metadata };

    // SPENDING_SPIKE: derive overPercent from ratio
    if (item.type === 'SPENDING_SPIKE' && data.ratio) {
      data.overPercent = ((Number(data.ratio) - 1) * 100).toFixed(0);
    }

    // SUBSCRIPTION_OVERLAP: names is an array → join for display
    if (item.type === 'SUBSCRIPTION_OVERLAP' && Array.isArray(data.names)) {
      data.names = (data.names as string[]).join(', ');
    }

    const translated = t(key, data as Record<string, string>);
    // If i18next returns the raw key, the template is missing → use server fallback
    return translated === key ? item.description : translated;
  };
}

export const PriceChangeTimeline = ({ anomalies, isLoading }: PriceChangeTimelineProps) => {
  const { t } = useTranslation('finance');
  const localizeDescription = useLocalizedDescription(t);

  if (isLoading) {
    return (
      <Card className="h-full p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </Card>
    );
  }

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
        {anomalies.map((item) => (
          <div key={item.id} className="relative group">
            {/* Timeline dot */}
            <div
              className={cn(
                'absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2 bg-surface transition-colors duration-300',
                DOT_STYLES[item.severity]
              )}
            />

            <div
              className={cn(
                'p-3 rounded-lg border transition-all duration-300 hover:shadow-sm',
                SEVERITY_STYLES[item.severity]
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-surface shadow-sm">
                    {ICON_MAP[item.type] || <AlertCircle className="h-4 w-4 text-gray-500" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-base-content">
                      {item.subscriptionName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {t(`anomalies.types.${item.type.toLowerCase()}`, item.type.replace(/_/g, ' '))}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {format(new Date(item.date), 'yyyy-MM-dd')}
                </span>
              </div>

              <p className="text-sm text-base-content/80 mt-1">{localizeDescription(item)}</p>

              {/* Extra detail for price changes */}
              {(item.type === 'PRICE_INCREASE' || item.type === 'PRICE_DECREASE') &&
                item.metadata.oldPrice != null && (
                  <div className="mt-2 text-xs flex items-center gap-2 text-muted-foreground">
                    <span className="line-through">
                      {item.metadata.currency} {item.metadata.oldPrice}
                    </span>
                    <span
                      className={cn(
                        'font-bold',
                        item.type === 'PRICE_INCREASE'
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      → {item.metadata.currency} {item.metadata.newPrice}
                    </span>
                  </div>
                )}

              {/* Extra detail for budget exceeded */}
              {item.type === 'BUDGET_EXCEEDED' && (
                <div className="mt-2 text-xs flex items-center gap-2">
                  <Wallet className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {item.metadata.spent} / {item.metadata.limit}
                  </span>
                  <span className="text-red-600 dark:text-red-400 font-bold">
                    +{item.metadata.overPercent}%
                  </span>
                </div>
              )}

              {/* Extra detail for duplicate billing */}
              {item.type === 'DUPLICATE_BILLING' && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {item.metadata.count} × {item.metadata.currency} {item.metadata.totalAmount}
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
