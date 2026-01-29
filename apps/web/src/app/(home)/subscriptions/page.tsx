'use client';

import { useState, useEffect } from 'react';
import { SubscriptionCard } from '@/components/features/subscriptions/subscription-card';
import { SubscriptionDetailDrawer } from '@/components/features/subscriptions/drawer/subscription-detail-drawer';
import { Input } from '@/components/ui/input';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Search, Loader2, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services';
import { SubscriptionDTO } from '@subcare/types';
import { useInView } from 'react-intersection-observer';
import { useSearchParams } from 'next/navigation';
import { PageMeta } from '@/components/common/page-meta';

// Constants
const CATEGORIES = ['Entertainment', 'Tools', 'Productivity', 'Cloud', 'Utility', 'Education'];
const STATUSES = ['Active', 'Paused', 'Cancelled'];
const CYCLES = ['Monthly', 'Yearly'];
const ITEMS_PER_PAGE = 12;

export default function SubscriptionsPage() {
  const { t } = useTranslation('subscription');
  const searchParams = useSearchParams();
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [cycleFilter, setCycleFilter] = useState('All');
  const [expiringInFilter, setExpiringInFilter] = useState(searchParams.get('expiringIn') || 'All');
  const [isResetting, setIsResetting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Drawer State
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionDTO | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const EXPIRING_OPTIONS = [
    { label: t('filter_all_time', 'All Time'), value: 'All' },
    { label: t('filter_next_7_days', 'Next 7 Days'), value: '7' },
    { label: t('filter_next_15_days', 'Next 15 Days'), value: '15' },
    { label: t('filter_next_30_days', 'Next 30 Days'), value: '30' },
  ];

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Infinite Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['subscriptions', debouncedSearch, statusFilter, categoryFilter, cycleFilter, expiringInFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await subscriptionService.getAll({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        billingCycle: cycleFilter !== 'All' ? cycleFilter : undefined,
        expiringInDays: expiringInFilter !== 'All' ? parseInt(expiringInFilter) : undefined,
        page: pageParam,
        limit: ITEMS_PER_PAGE,
      });
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });

  // Flatten pages to items
  const items = data?.pages.flatMap((page: any) => page.subscriptions) || [];

  // Infinite Scroll Observer
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
  };

  const handleCycleChange = (value: string) => {
    setCycleFilter(value);
  };

  const handleExpiringInChange = (value: string) => {
    setExpiringInFilter(value);
  };

  const resetFilters = () => {
    setIsResetting(true);
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('All');
    setCategoryFilter('All');
    setCycleFilter('All');
    setExpiringInFilter('All');
    setTimeout(() => setIsResetting(false), 500);
  };

  const handleCardClick = (id: string) => {
    const subscription = items.find((item: SubscriptionDTO) => item.id === id);
    if (subscription) {
      setSelectedSubscription(subscription);
      setIsDrawerOpen(true);
    }
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedSubscription(null), 300); // Clear after animation
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'All' || categoryFilter !== 'All' || cycleFilter !== 'All' || expiringInFilter !== 'All';

  if (isError) {
      // TODO: Better error handling UI
      console.error('Failed to load subscriptions');
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageMeta titleKey="metadata.subscriptions.title" descriptionKey="metadata.subscriptions.description" />
      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            placeholder={t('search_placeholder') || "Search subscriptions..."} 
            className="pl-9 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-800 transition-colors"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="flex w-full xl:w-auto gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide items-center">
          {/* Reset Button */}
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              className="text-gray-500 hover:text-lavender hover:bg-lavender/10 h-9 px-2 shrink-0 transition-colors"
              onClick={resetFilters}
              title={t('reset_filters')}
              disabled={isResetting}
            >
              <RotateCcw className={cn("w-4 h-4 mr-1", isResetting && "animate-spin")} />
              <span className="hidden md:inline">{t('reset_filters')}</span>
            </Button>
          )}

          {/* Expiring Soon Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap hidden md:block">{t('filter_label_expiring', 'Expiring')}</span>
            <FilterDropdown
              value={expiringInFilter}
              onChange={handleExpiringInChange}
              options={EXPIRING_OPTIONS}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap hidden md:block">{t('filter_label_status')}</span>
            <FilterDropdown
              value={statusFilter}
              onChange={handleStatusChange}
              options={[
                { label: t('filter_all_status'), value: 'All' },
                ...STATUSES.map(s => ({ label: t(`status.${s}`, { defaultValue: s }), value: s }))
              ]}
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap hidden md:block">{t('filter_label_category')}</span>
            <FilterDropdown
              value={categoryFilter}
              onChange={handleCategoryChange}
              options={[
                { label: t('filter_all_categories'), value: 'All' },
                ...CATEGORIES.map(c => ({ label: t(`categories.${c.toLowerCase()}`, { defaultValue: c }), value: c }))
              ]}
            />
          </div>

          {/* Cycle Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap hidden md:block">{t('filter_label_cycle')}</span>
            <FilterDropdown
              value={cycleFilter}
              onChange={handleCycleChange}
              options={[
                { label: t('filter_all_cycles'), value: 'All' },
                ...CYCLES.map(c => ({ label: t(`cycle_options.${c}`, { defaultValue: c }), value: c }))
              ]}
            />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((sub: SubscriptionDTO) => (
             <SubscriptionCard 
               key={sub.id} 
               subscription={sub} 
               onClick={handleCardClick}
             />
        ))}
      </div>

      {/* Loading State & Empty State */}
      {(isLoading || isFetchingNextPage) && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 text-lavender animate-spin" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p>{t('no_subscriptions_found')}</p>
        </div>
      )}
      
      {!hasNextPage && items.length > 0 && !isFetchingNextPage && (
        <div className="text-center py-8 text-gray-400 text-sm">
          {t('no_more_subscriptions')}
        </div>
      )}
      
      {/* Infinite Scroll Trigger */}
      <div ref={ref} className="h-4" />

      {/* Detail Drawer */}
      <SubscriptionDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={handleDrawerClose} 
        subscription={selectedSubscription} 
      />
    </div>
  );
}
