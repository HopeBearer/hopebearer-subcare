'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/hooks';
import { useAuthStore } from '@/store/auth.store';
import { 
  LayoutDashboard, 
  CreditCard, 
  PieChart, 
  Bell, 
  Settings, 
  ShieldCheck,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation('common');
  const { user, logout } = useAuthStore();

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
    <aside className="w-72 h-screen bg-surface border-r border-base flex flex-col fixed left-0 top-0 z-50 transition-all duration-300">
      {/* Logo Section */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          {t('app_name')}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary-soft text-primary font-medium shadow-sm" 
                  : "text-secondary hover:bg-gray-50 hover:text-primary dark:hover:bg-gray-800"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-gray-400 group-hover:text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-base m-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#EAEAFE] flex items-center justify-center text-white font-bold shadow-sm">
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
          <Settings className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </aside>
  );
}
