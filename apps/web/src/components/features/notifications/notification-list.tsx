'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { api } from '@/lib/api';
import { NotificationItem } from './notification-item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCheck, Inbox, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { NotificationDTO } from '@subcare/types';
import { useNotificationStore } from '@/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import Fuse from 'fuse.js';

export function NotificationList() {
  const { t } = useTranslation('common');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();
  const { decrementUnread, resetUnread } = useNotificationStore();

  // Client-side pagination state
  const [displayCount, setDisplayCount] = useState(20);

  // Fetch a large batch of notifications (e.g. 1000) to support client-side i18n search
  // In a real-world app, this might be heavy, but for notifications it's often acceptable.
  // Ideally, we would fetch ALL notifications for search, or use a backend search engine (Elasticsearch/MeiliSearch) 
  // that can index localized content. For now, fetching 1000 is a pragmatic solution.
  const { data: allNotifications, isLoading } = useQuery({
    queryKey: ['notifications', 'list', 1000],
    queryFn: async () => {
      const response = await api.get('/notifications', {
        params: {
          page: 1,
          limit: 1000,
          // No backend filter/search params, we do it all client-side
        }
      });
      return response.data.items as NotificationDTO[];
    },
  });

  // Prepare data with resolved translations for Fuse.js
  const searchableItems = useMemo(() => {
    if (!allNotifications) return [];
    
    return allNotifications.map(item => ({
      ...item,
      // Resolve localized text for searching
      _searchTitle: item.key 
        ? t(`${item.key}.title`, { ...item.data, defaultValue: item.title })
        : item.title,
      _searchContent: item.key 
        ? t(`${item.key}.content`, { ...item.data, defaultValue: item.content })
        : item.content
    }));
  }, [allNotifications, t]);

  // Initialize Fuse instance
  const fuse = useMemo(() => {
    return new Fuse(searchableItems, {
      keys: ['_searchTitle', '_searchContent'],
      threshold: 0.3, // Fuzzy match threshold
      ignoreLocation: true,
      useExtendedSearch: true
    });
  }, [searchableItems]);

  // Filter and Search
  const filteredItems = useMemo(() => {
    let items = searchableItems;

    // 1. Filter by Status
    if (filter === 'unread') {
      items = items.filter(item => !item.isRead);
    }

    // 2. Search using Fuse.js
    if (debouncedSearch) {
      items = fuse.search(debouncedSearch).map(result => result.item);
    }

    return items;
  }, [searchableItems, filter, debouncedSearch, fuse]);

  // Reset display count when filter/search changes
  useEffect(() => {
    setDisplayCount(20);
  }, [filter, debouncedSearch]);

  // Get current slice for rendering
  const visibleItems = filteredItems.slice(0, displayCount);
  const hasMore = visibleItems.length < filteredItems.length;

  // Infinite scroll trigger
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasMore) {
      setDisplayCount(prev => prev + 20);
    }
  }, [inView, hasMore]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      // Refresh list to show read status
      // We invalidate the list query
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
        toast.error(t('error.generic'));
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('success.saved'));
    }
  });

  const handleItemClick = (notification: NotificationDTO) => {
      if (!notification.isRead) {
          markAsReadMutation.mutate(notification.id);
      }
      if (notification.link) {
          window.location.href = notification.link;
      }
  };

  const isEmpty = visibleItems.length === 0 && !isLoading;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex p-1 bg-surface border border-base rounded-xl flex-shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              filter === 'all' 
                ? "bg-white dark:bg-gray-800 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                : "text-secondary hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
          >
            {t('common.all', { defaultValue: 'All' })}
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              filter === 'unread' 
                ? "bg-white dark:bg-gray-800 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                : "text-secondary hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
          >
            {t('common.unread', { defaultValue: 'Unread' })}
          </button>
        </div>

        <div className="flex flex-1 w-full sm:w-auto items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                    placeholder={t('common.search', { defaultValue: 'Search...' })} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 text-sm rounded-xl bg-surface border-base focus:ring-1 focus:ring-primary/20"
                />
            </div>
            
            <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className={cn(
                    'hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ease group flex-shrink-0',
                    'border border-gray-200 dark:border-gray-600 hover:border-[#A5A6F6]/30',
                    'bg-transparent hover:bg-primary-pale dark:hover:bg-white/5',
                    markAllAsReadMutation.isPending && "opacity-70 cursor-not-allowed"
                )}
            >
                {markAllAsReadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-gray-500 dark:text-gray-400 group-hover:text-primary" />
                ) : (
                    <CheckCheck className="w-4 h-4 mr-1.5 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-primary" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors group-hover:text-primary">
                    {t('notifications.mark_all_read', { defaultValue: 'Mark all as read' })}
                </span>
            </button>
            
             {/* Mobile Mark Read Icon Only */}
             <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className={cn(
                    'sm:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ease',
                    'border border-gray-200 dark:border-gray-600',
                    'bg-surface',
                    markAllAsReadMutation.isPending && "opacity-70 cursor-not-allowed"
                )}
                title={t('notifications.mark_all_read', { defaultValue: 'Mark all as read' })}
            >
                {markAllAsReadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : (
                    <CheckCheck className="w-4 h-4 text-gray-500" />
                )}
            </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 min-h-[300px]">
        {isLoading && !allNotifications ? (
           <div className="flex flex-col gap-3">
              {[1,2,3].map(i => (
                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
           </div>
        ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('notifications.empty_title', { defaultValue: 'No notifications' })}
                </h3>
                <p className="text-sm text-secondary mt-1 max-w-xs mx-auto">
                    {t('notifications.empty_description', { defaultValue: "You're all caught up! We'll notify you when something important happens." })}
                </p>
            </div>
        ) : (
            <>
                {visibleItems.map((item) => (
                    <NotificationItem 
                        key={item.id} 
                        notification={item} 
                        onRead={(id) => markAsReadMutation.mutate(id)}
                        onClick={handleItemClick}
                    />
                ))}
                
                {hasMore && (
                    <div ref={ref} className="py-4 flex justify-center w-full">
                        <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
}
