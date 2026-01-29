'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/hooks';
import { useAuthStore, useLayoutStore } from '@/store';
import { 
  LayoutDashboard, 
  CreditCard, 
  PieChart, 
  Bell, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsPageSidebar } from './settings-sidebar';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation('common');
  const { user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();

  const isSettingsPage = pathname?.startsWith('/settings');

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
          "font-logo  font-normal text-gray-900 dark:text-white tracking-tight transition-opacity duration-300",
          isSidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "text-3xl opacity-100"
        )}>
          {t('app_name')}
        </span>
      </div>

      {/* Navigation */}
      {isSettingsPage ? (
        <SettingsPageSidebar />
      ) : (
        <nav className="flex-1 px-4 space-y-2 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
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
      )}

      {/* User Profile Section */}
      <div className="border-t border-base p-4">
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
          {/* Always show avatar or icon? User asked for 'settings icon' when collapsed. 
              The current design uses avatar as the main icon. 
              But there is also a Settings icon at the end.
              If collapsed, maybe show Settings icon instead of Avatar? 
              Or Avatar and Settings icon is hidden? 
              Let's look at the request: "折叠的时候留下logo，icon，和设置的icon即可"
              "Settings icon" might mean the actual gear icon.
              If I hide avatar and show gear icon, it might be confusing if the user expects avatar.
              But I will follow the text "settings icon".
          */}
           
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
