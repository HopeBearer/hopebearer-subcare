'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { SubscriptionDTO } from '@subcare/types';
import { useTranslation } from '@/lib/i18n/hooks';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Select } from '@/components/ui/select';

interface SubscriptionSimulatorProps {
  subscriptions: SubscriptionDTO[];
  excludedIds: string[];
  onToggle: (id: string) => void;
}

type SortOption = 'name' | 'price-desc' | 'price-asc';

export const SubscriptionSimulator = ({ 
  subscriptions, 
  excludedIds, 
  onToggle 
}: SubscriptionSimulatorProps) => {
  const { t } = useTranslation('finance');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOption>('price-desc');
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter(sub => 
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortOrder === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortOrder === 'price-desc') {
          return b.price - a.price;
        }
        return a.price - b.price;
      });
  }, [subscriptions, searchTerm, sortOrder]);

  const activeCount = subscriptions.length - excludedIds.length;
  
  // Virtualizer instance
  const rowVirtualizer = useVirtualizer({
    count: filteredSubscriptions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Estimated height of each row in px (compact view)
    overscan: 5,
  });

  const sortOptions = [
    { label: t('simulator.sort_options.price_desc', { defaultValue: 'Price: High to Low' }), value: 'price-desc' },
    { label: t('simulator.sort_options.price_asc', { defaultValue: 'Price: Low to High' }), value: 'price-asc' },
    { label: t('simulator.sort_options.name', { defaultValue: 'Name: A-Z' }), value: 'name' },
  ];

  return (
    <Card className="p-4 flex flex-col overflow-hidden bg-surface-50 dark:bg-surface-900/20 h-[500px]">
      <div className="flex flex-col gap-3 mb-4 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-base-content">
            {t('simulator.title')}
          </h3>
          <span className="text-xs text-muted-foreground bg-surface-200 dark:bg-surface-800 px-2 py-0.5 rounded-full">
            {activeCount}/{subscriptions.length} {t('status.active', { defaultValue: 'Active' })}
          </span>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('simulator.search_placeholder', { defaultValue: 'Search...' })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="w-[140px] shrink-0">
             <Select
                options={sortOptions}
                value={sortOrder}
                onChange={(val) => setSortOrder(val as SortOption)}
                className="h-9 text-xs"
                placeholder={t('simulator.sort')}
             />
          </div>
        </div>
      </div>

      <div 
        ref={parentRef} 
        className="flex-1 overflow-y-auto min-h-0 pr-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {filteredSubscriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('simulator.no_results', { defaultValue: 'No subscriptions found' })}
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const sub = filteredSubscriptions[virtualItem.index];
              const isIncluded = !excludedIds.includes(sub.id);
              
              return (
                <div
                  key={sub.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="pb-2 box-border"
                >
                  <div 
                    className={`flex items-center justify-between p-2 rounded-md border h-full transition-all ${
                      isIncluded 
                        ? 'bg-surface border-base shadow-sm' 
                        : 'bg-gray-50/50 dark:bg-gray-800/20 border-transparent opacity-50 hover:opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                         isIncluded ? 'bg-primary/10 text-primary' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                       }`}>
                          {sub.name.charAt(0).toUpperCase()}
                       </div>
                       <div className="min-w-0 truncate">
                         <div className="font-medium text-sm truncate">{sub.name}</div>
                         <div className="text-xs text-muted-foreground truncate">
                           {sub.currency} {sub.price} <span className="opacity-70">/ {t(`cycle.${sub.billingCycle.toLowerCase()}`, { defaultValue: sub.billingCycle })}</span>
                         </div>
                       </div>
                    </div>
                    <Switch 
                      checked={isIncluded}
                      onCheckedChange={() => onToggle(sub.id)}
                      className="scale-75 origin-right ml-2 shrink-0"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
