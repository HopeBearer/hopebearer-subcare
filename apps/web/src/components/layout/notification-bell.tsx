'use client';

import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/store';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { api } from '@/lib/api';

export function NotificationBell({ className }: { className?: string }) {
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const router = useRouter();
  const { t } = useTranslation('common');

  // Fetch initial unread count on mount
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        // The interceptor unwraps response.data, so response IS the body
        // Body structure: { success: true, data: { count: number } }
        if (response.data && typeof response.data.count === 'number') {
           setUnreadCount(response.data.count);
        }
      } catch (error) {
        console.error('Failed to fetch unread count', error);
      }
    };

    fetchUnreadCount();
  }, [setUnreadCount]);

  const handleClick = () => {
    router.push('/notifications');
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative rounded-xl transition-all w-9 h-9 flex items-center justify-center duration-200 group",
        "text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary hover:bg-primary-pale hover:text-primary dark:hover:bg-white/5",
        className
      )}
      aria-label={t('nav.notifications')}
      title={t('nav.notifications')}
    >
      <Bell className="size-5 transition-transform group-hover:scale-110" />
      
      {unreadCount > 0 && (
        <span className={cn(
          "absolute -top-0.5 right-0.5 flex size-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-1",
          "animate-in zoom-in duration-200"
        )}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
