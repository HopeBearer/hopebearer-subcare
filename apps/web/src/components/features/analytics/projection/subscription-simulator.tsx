'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch'; // Assuming Switch component exists
import { SubscriptionDTO } from '@subcare/types';
import { useTranslation } from '@/lib/i18n/hooks';

interface SubscriptionSimulatorProps {
  subscriptions: SubscriptionDTO[];
  excludedIds: string[];
  onToggle: (id: string) => void;
}

export const SubscriptionSimulator = ({ 
  subscriptions, 
  excludedIds, 
  onToggle 
}: SubscriptionSimulatorProps) => {
  const { t } = useTranslation('analytics');

  return (
    <Card className="p-6 h-full flex flex-col">
      <h3 className="text-lg font-bold text-base-content mb-4">
        {t('simulator.title', 'What-If Simulator')}
      </h3>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {subscriptions.map(sub => {
          const isIncluded = !excludedIds.includes(sub.id);
          return (
            <div 
              key={sub.id} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isIncluded 
                  ? 'bg-surface border-base' 
                  : 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                 {/* Icon placeholder */}
                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                    {sub.name.charAt(0)}
                 </div>
                 <div>
                   <div className="font-medium text-sm">{sub.name}</div>
                   <div className="text-xs text-muted-foreground">
                     {sub.currency} {sub.price} / {sub.billingCycle}
                   </div>
                 </div>
              </div>
              <Switch 
                checked={isIncluded}
                onCheckedChange={() => onToggle(sub.id)}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};
