'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/hooks';
import { useAuthStore, useLayoutStore, useChatStore } from '@/store';
import { 
  LayoutDashboard, 
  CreditCard, 
  PieChart, 
  Bell, 
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  MessageCircle,
  Trash2,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsPageSidebar } from './settings-sidebar';
import { useEffect, useRef, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS, ja } from 'date-fns/locale';

// 虚拟滚动配置 - 已禁用，使用普通滚动避免抖动
// 对话列表通常不会有太多项目，普通滚动性能足够
const ENABLE_VIRTUAL_SCROLL = false;
const ITEM_HEIGHT = 52; // 增加高度以匹配实际内容
const BUFFER_SIZE = 5;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, i18n } = useTranslation('common');
  const { user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();
  // 精细订阅：sidebar 不订阅 activeStreamContent / activeToolCalls
  const conversations = useChatStore(state => state.conversations);
  const isLoadingConversations = useChatStore(state => state.isLoadingConversations);
  const hasMoreConversations = useChatStore(state => state.hasMoreConversations);
  const currentConversationId = useChatStore(state => state.currentConversationId);
  const sessionStatuses = useChatStore(state => state.sessionStatuses);
  const fetchConversations = useChatStore(state => state.fetchConversations);
  const loadMoreConversations = useChatStore(state => state.loadMoreConversations);
  const createConversation = useChatStore(state => state.createConversation);
  const selectConversation = useChatStore(state => state.selectConversation);
  const deleteConversation = useChatStore(state => state.deleteConversation);

  const isSettingsPage = pathname?.startsWith('/settings');
  const isChatPage = pathname?.startsWith('/chat');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);

  // 加载对话列表
  useEffect(() => {
    fetchConversations(true);
  }, [fetchConversations]);

  // 获取日期 locale
  const getDateLocale = () => {
    const lang = i18n?.language || 'zh';
    if (lang === 'zh') return zhCN;
    if (lang === 'ja') return ja;
    return enUS;
  };

  // 处理滚动 - 触底加载更多
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollHeight, scrollTop, clientHeight } = target;
    
    // 距离底部 100px 时触发加载更多
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMoreConversations && !isLoadingConversations) {
      loadMoreConversations();
    }
  }, [hasMoreConversations, isLoadingConversations, loadMoreConversations]);

  // 创建新对话 - 只跳转到 /chat，不创建会话
  const handleNewChat = () => {
    // 清除当前会话状态
    selectConversation(null);
    router.push('/chat');
  };

  // 选择对话 — 先同步更新 state（如果有 buffer 则即时恢复），再跳转路由
  const handleSelectConversation = (id: string) => {
    selectConversation(id); // 同步路径（buffer 恢复）立即更新 Zustand，避免渲染空白帧
    router.push(`/chat/${id}`);
  };

  // 点击导航项时清除当前会话（确保只有一个高亮）
  const handleNavClick = () => {
    if (currentConversationId) {
      selectConversation(null);
    }
  };

  // 删除对话
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation(id);
    setShowDeleteMenu(null);
    if (currentConversationId === id) {
      router.push('/chat');
    }
  };

  const navItems = [
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
    },
    {
      href: '/subscriptions',
      icon: CreditCard,
      label: t('nav.subscriptions'),
    },
    {
      href: '/finance',
      icon: PieChart,
      label: t('nav.finance'),
    },
    {
      href: '/notifications',
      icon: Bell,
      label: t('nav.notifications'),
    },
  ];

  return (
    <aside 
      className={cn(
        "h-screen bg-surface border-r border-base flex flex-col fixed left-0 top-0 z-50 transition-all duration-300",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 w-6 h-6 bg-surface border border-base rounded-full flex items-center justify-center text-secondary hover:text-primary transition-colors shadow-sm z-50"
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Logo Section */}
      <div className={cn("flex items-center transition-all duration-300", isSidebarCollapsed ? "justify-center gap-0" : "px-8 pt-8 gap-3")}>
        <img src="/images/logo.png" alt="SubCare Logo" className="h-8 w-auto" />
        <span className={cn(
          "font-logo font-normal text-gray-900 dark:text-white tracking-tight transition-opacity duration-300",
          isSidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "text-3xl opacity-100"
        )}>
          {t('app_name')}
        </span>
      </div>

      {/* Content Area */}
      {isSettingsPage ? (
        <SettingsPageSidebar />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* New Chat Button */}
          <div className="px-4 pt-4 pb-2">
            <button
              onClick={handleNewChat}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                "bg-primary text-white hover:bg-primary-600 shadow-sm",
                isSidebarCollapsed && "justify-center px-2 gap-0"
              )}
              title={isSidebarCollapsed ? t('nav.new_chat') : undefined}
            >
              <MessageSquarePlus className="w-5 h-5" />
              <span className={cn(
                "font-medium transition-all duration-300 whitespace-nowrap overflow-hidden",
                isSidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                {t('nav.new_chat')}
              </span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="px-4 space-y-2 py-4">
            {navItems.map((item) => {
              // 只有当前路径匹配且没有选中任何会话时才高亮
              const isActive = !currentConversationId && (pathname === item.href || pathname?.startsWith(item.href + '/'));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mb-1",
                    isActive 
                      ? "bg-primary-soft text-primary font-medium shadow-sm" 
                      : "text-secondary hover:bg-primary-pale hover:text-primary dark:hover:bg-gray-800",
                    isSidebarCollapsed && "justify-center px-2 gap-0"
                  )}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-gray-400 group-hover:text-primary")} />
                  <span className={cn(
                    "transition-all duration-300 whitespace-nowrap overflow-hidden",
                    isSidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Conversation List (Virtual Scroll) */}
          {!isSidebarCollapsed && (
            <div className="flex-1 flex flex-col min-h-0 px-4 pt-2">
              {/* Section Title */}
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('chat.conversations')}
                </span>
              </div>

              {/* Conversation List Container - 普通滚动模式 */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 overscroll-contain"
                onScroll={handleScroll}
              >
                {conversations.length === 0 && !isLoadingConversations ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{t('chat.no_conversations')}</p>
                    <p className="text-xs mt-1">{t('chat.start_chatting')}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conversation) => {
                      const isActive = currentConversationId === conversation.id || pathname === `/chat/${conversation.id}`;
                      const isStreamingConversation = !!sessionStatuses[conversation.id];
                      
                      return (
                        <div
                          key={conversation.id}
                          className={cn(
                            "group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 relative",
                            isActive 
                              ? "bg-primary-soft text-primary font-medium shadow-sm" 
                              : "text-secondary hover:bg-primary-pale hover:text-primary dark:hover:bg-gray-800"
                          )}
                          onClick={() => handleSelectConversation(conversation.id)}
                        >
                          <MessageCircle className={cn(
                            "w-4 h-4 flex-shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-gray-400 group-hover:text-primary"
                          )} />
                          <div className="flex-1 min-w-0 leading-tight">
                            <span className="text-sm truncate block">{conversation.title}</span>
                            <span className="text-xs text-gray-400 truncate block">
                              {formatDistanceToNow(new Date(conversation.updatedAt), {
                                addSuffix: true,
                                locale: getDateLocale()
                              })}
                            </span>
                          </div>

                          {isStreamingConversation && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          )}
                          
                          {/* Delete Button */}
                          <button
                            className={cn(
                              "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                              "hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                            )}
                            onClick={(e) => handleDeleteConversation(conversation.id, e)}
                            title={t('chat.delete_conversation')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Loading indicator */}
                {isLoadingConversations && (
                  <div className="text-center py-4">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collapsed state: Chat icon */}
          {isSidebarCollapsed && (
            <div className="px-4 py-2">
              <Link
                href="/chat"
                className={cn(
                  "flex items-center justify-center p-3 rounded-xl transition-all duration-200",
                  isChatPage 
                    ? "bg-primary-soft text-primary" 
                    : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary"
                )}
                title={t('nav.chat')}
              >
                <MessageCircle className="w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* User Profile Section */}
      <div className="border-t border-base p-4 mt-auto">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
            isSettingsPage
              ? "bg-primary-soft text-primary shadow-sm"
              : "hover:bg-gray-50 dark:hover:bg-gray-800 text-secondary hover:text-gray-900",
            isSidebarCollapsed && "justify-center gap-0 px-2"
          )}
          title={isSidebarCollapsed ? (user?.name || 'User') : undefined}
        >
          {isSidebarCollapsed ? (
             <Settings className={cn("w-5 h-5 transition-colors", isSettingsPage ? "text-primary" : "text-gray-400 group-hover:text-primary")} />
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold shadow-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", isSettingsPage ? "text-primary" : "text-gray-900 dark:text-white")}>
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'user@example.com'}
                </p>
                {user?.bio && (
                  <p className="text-[10px] text-gray-400 truncate mt-0.5 font-normal opacity-80">
                    {user.bio}
                  </p>
                )}
              </div>
              <Settings className={cn("w-4 h-4 transition-colors", isSettingsPage ? "text-primary" : "text-gray-400 group-hover:text-primary")} />
            </>
          )}
        </Link>
      </div>
    </aside>
  );
}
