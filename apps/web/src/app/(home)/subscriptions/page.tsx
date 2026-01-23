'use client';

import { useState, useEffect } from 'react';
import { SubscriptionCard } from '@/components/features/subscriptions/subscription-card';
import { Input } from '@/components/ui/input';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Search, Loader2, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services/subscription.service';
import { SubscriptionDTO } from '@subcare/types';
import { useInView } from 'react-intersection-observer';

// Constants
const CATEGORIES = ['Entertainment', 'Tools', 'Productivity', 'Cloud', 'Utility', 'Education'];
const STATUSES = ['Active', 'Paused', 'Cancelled'];
const CYCLES = ['Monthly', 'Yearly'];
const ITEMS_PER_PAGE = 12;

export default function SubscriptionsPage() {
  const { t } = useTranslation('subscription');
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [cycleFilter, setCycleFilter] = useState('All');
  const [isResetting, setIsResetting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
    queryKey: ['subscriptions', debouncedSearch, statusFilter, categoryFilter, cycleFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await subscriptionService.getAll({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        billingCycle: cycleFilter !== 'All' ? cycleFilter : undefined,
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

  const resetFilters = () => {
    setIsResetting(true);
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('All');
    setCategoryFilter('All');
    setCycleFilter('All');
    setTimeout(() => setIsResetting(false), 500);
  };

  const handleCardClick = (id: string) => {
    console.log('Navigate to subscription details:', id);
    // router.push(`/subscriptions/${id}`);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'All' || categoryFilter !== 'All' || cycleFilter !== 'All';

  if (isError) {
      // TODO: Better error handling UI
      console.error('Failed to load subscriptions');
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Search and Filter Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between sticky top-0 z-10 backdrop-blur-xl bg-white/90">
        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            placeholder={t('search_placeholder') || "Search subscriptions..."} 
            className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
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
          <p>No subscriptions found matching your filters.</p>
        </div>
      )}
      
      {!hasNextPage && items.length > 0 && !isFetchingNextPage && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No more subscriptions to load.
        </div>
      )}
      
      {/* Infinite Scroll Trigger */}
      <div ref={ref} className="h-4" />
    </div>
  );
}
