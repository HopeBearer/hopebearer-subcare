import { NotificationDTO, NotificationType } from '@subcare/types';
import { cn } from '@/lib/utils';
import { Bell, CreditCard, ShieldAlert, Sparkles, Check, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface NotificationItemProps {
  notification: NotificationDTO;
  onRead: (id: string) => void;
  onClick: (notification: NotificationDTO) => void;
}

export function NotificationItem({ notification, onRead, onClick }: NotificationItemProps) {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language.startsWith('zh') ? zhCN : enUS;

  const getIcon = (type: string) => {
    switch (type) {
      case NotificationType.BILLING:
        return <CreditCard className="w-5 h-5 text-blue-500" />;
      case NotificationType.SECURITY:
        return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case NotificationType.MARKETING:
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/20';
      case 'HIGH':
        return 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/20';
      default:
        return 'bg-surface hover:bg-gray-50/50 dark:hover:bg-gray-800/50';
    }
  };

  // Resolve Title and Content using i18n if key is present
  const title = notification.key 
      ? t(notification.key, { ...notification.data, defaultValue: notification.title }) 
      : notification.title;
      
  // For content, sometimes we might have a specific key structure like "key_content" or similar.
  // But usually notification key resolves to the main message.
  // If we want title + content, we might need a convention. 
  // Let's assume:
  // - notification.key -> Title (or summary)
  // - notification.content -> Fallback detail
  // OR: 
  // - We map key to title, and maybe key + "_desc" to content?
  // 
  // For now, let's use the key for the main "Title/Message" shown in bold, 
  // and use existing content as secondary text if it differs, or if we have a strategy.
  //
  // Actually, looking at the backend changes:
  // e.g. key: "notification.auth.welcome"
  // The translation likely contains the full message.
  // 
  // Strategy:
  // 1. Title = t(key) 
  // 2. Content = notification.content (as fallback detail or just hidden if title covers it?)
  // 
  // Let's treat the key as the source of truth for the MAIN text.
  // If the translation for the key exists, we display it as the "Title" area.
  // The "Content" area might be redundant if the key covers it.
  // But let's check if we have a secondary key convention.
  // If not, we can just use the backend-provided fallback content for the paragraph if no better option.
  //
  // Alternative:
  // Title = t(notification.key + ".title", defaultValue: notification.title)
  // Content = t(notification.key + ".content", defaultValue: notification.content)
  // This is safer if we organize locales like:
  // "notification": { "auth": { "welcome": { "title": "Welcome", "content": "..." } } }
  // But previously we defined keys like: "welcome": "Welcome {{user}}!" (Single string)
  //
  // Let's stick to Single String for the main message (Title area), and use content as description.
  
  const displayTitle = notification.key 
    ? t(`${notification.key}.title`, { ...notification.data, defaultValue: notification.title })
    : notification.title;

  // Try to find if there is a content specific translation, otherwise use backend content
  const displayContent = notification.key 
    ? t(`${notification.key}.content`, { ...notification.data, defaultValue: notification.content })
    : notification.content;
    
  // If the key translation returned the key itself (meaning missing), fallback to backend provided text.
  // i18next usually returns the key if missing unless configured otherwise.
  
  return (
    <div
      onClick={() => onClick(notification)}
      className={cn(
        "flex gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer group relative",
        notification.isRead 
          ? "bg-gray-50/50 dark:bg-white/5 border-transparent hover:bg-gray-100/50 dark:hover:bg-white/10" 
          : "bg-surface border-base shadow-sm hover:shadow-md hover:-translate-y-0.5",
        !notification.isRead && getPriorityStyle(notification.priority),
      )}
    >
       {/* Status Indicator Dot */}
      {!notification.isRead && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
      )}

      {/* Icon Section */}
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105",
        notification.isRead 
          ? "bg-gray-100 dark:bg-gray-800/50 border-transparent grayscale opacity-70"
          : "bg-white dark:bg-gray-800 border-base shadow-sm",
        !notification.isRead && {
            'bg-blue-50 dark:bg-blue-900/20': notification.type === NotificationType.BILLING,
            'bg-red-50 dark:bg-red-900/20': notification.type === NotificationType.SECURITY,
            'bg-purple-50 dark:bg-purple-900/20': notification.type === NotificationType.MARKETING,
        }
      )}>
        {getIcon(notification.type)}
      </div>

      {/* Content Section */}
      <div className="flex-1 min-w-0 space-y-1 py-0.5">
        <div className="flex items-center justify-between pr-6">
          <h4 className={cn(
            "text-sm font-semibold truncate transition-colors", 
            notification.isRead ? "text-gray-500 dark:text-gray-400 font-medium" : "text-gray-900 dark:text-white"
          )}>
            {displayTitle}
          </h4>
          <span className={cn(
            "text-xs flex items-center gap-1 flex-shrink-0 transition-colors",
            notification.isRead ? "text-gray-400 dark:text-gray-500" : "text-tertiary"
          )}>
             <Clock className="w-3 h-3" />
             {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale })}
          </span>
        </div>
        
        <p className={cn(
          "text-sm line-clamp-2 leading-relaxed transition-colors", 
          notification.isRead ? "text-gray-400 dark:text-gray-500" : "text-secondary"
        )}>
          {displayContent}
        </p>


        {/* Action Area */}
        <div className="flex items-center gap-3 mt-3 h-6">
          {notification.actionLabel && (
             <span className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
               {notification.actionLabel} &rarr;
             </span>
          )}
          
          {!notification.isRead && (
            <Button
              variant="ghost"
              className="h-7 px-2.5 text-xs ml-auto rounded-lg hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onRead(notification.id);
              }}
            >
              <Check className="w-3 h-3 mr-1.5" />
              {t('notifications.mark_read', { defaultValue: 'Mark read' })}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
