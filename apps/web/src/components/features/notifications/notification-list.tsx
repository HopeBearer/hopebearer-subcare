'use client';

import { useState, useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { api } from '@/lib/api';
import { NotificationItem } from './notification-item';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCheck, Inbox } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { NotificationDTO } from '@subcare/types';
import { useNotificationStore } from '@/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function NotificationList() {
  const { t } = useTranslation('common');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();
  const { decrementUnread, resetUnread } = useNotificationStore();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['notifications', filter],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get('/notifications', {
        params: {
          page: pageParam,
          limit: 20,
          filter // Assuming API supports filter, if not client side filter is needed or API update
        }
      });
      // Adapt response to infinite query format
      // response is { success: true, data: { items: [], total: number } }
      return {
          items: response.data.items as NotificationDTO[],
          total: response.data.total,
          nextPage: (response.data.items.length === 20) ? pageParam + 1 : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1
  });

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      decrementUnread();
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
      resetUnread();
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

  const allItems = data?.pages.flatMap(page => page.items) || [];
  const isEmpty = allItems.length === 0;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex p-1 bg-surface border border-base rounded-xl">
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

        <div className="flex gap-2">
            <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ease group',
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
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 min-h-[300px]">
        {isLoading && !data ? (
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
                {allItems.map((item) => (
                    <NotificationItem 
                        key={item.id} 
                        notification={item} 
                        onRead={(id) => markAsReadMutation.mutate(id)}
                        onClick={handleItemClick}
                    />
                ))}
                
                {hasNextPage && (
                    <div ref={ref} className="py-4 flex justify-center w-full">
                        {isFetchingNextPage && (
                            <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
                        )}
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
}
