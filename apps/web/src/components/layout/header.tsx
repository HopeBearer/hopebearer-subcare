'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { useAuthStore } from '@/store';
import { useModalStore } from '@/store';
import { useSettingsStore } from '@/store';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Plus, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { LanguageSwitcher } from '@/components/common/language-switcher';
import { cn } from '@/lib/utils';
import { settingsConfig } from '@/components/settings/config';
import { NotificationBell } from './notification-bell';

export function Header() {
  const { t } = useTranslation(['common', 'subscription', 'dashboard', 'settings']);
  const { user, logout } = useAuthStore();
  const { openAddSubscription } = useModalStore();
  const { activeTab } = useSettingsStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isSettingsPage = pathname?.includes('/settings');

  // Dynamic title logic
  const getPageTitle = () => {
    if (isSettingsPage) {
      const activeTabConfig = settingsConfig.find(tab => tab.id === activeTab) || settingsConfig[0];
      const tabLabel = t(activeTabConfig.label.replace('settings.', ''), { ns: 'settings', defaultValue: activeTabConfig.label.split('.').pop() });
      return `${t('nav.settings', { ns: 'common' })} —— ${tabLabel}`;
    }

    if (pathname?.includes('/dashboard')) return t('nav.dashboard', { ns: 'common' });
    if (pathname?.includes('/subscriptions')) return t('nav.subscriptions', { ns: 'common' });
    if (pathname?.includes('/finance')) return t('nav.finance', { ns: 'common' });
    if (pathname?.includes('/notifications')) return t('nav.notifications', { ns: 'common' });
    return t('app_name', { ns: 'common' });
  };

  const getPageSubtitle = () => {
    if (isSettingsPage) {
      const activeTabConfig = settingsConfig.find(tab => tab.id === activeTab) || settingsConfig[0];
      return t(activeTabConfig.description || '', { ns: 'settings' });
    }
    return t('header.welcome', { ns: 'dashboard', name: user?.name || 'User' });
  };

  return (
    <header className="h-20 px-8 flex items-center justify-between z-40 bg-surface border-b border-base shadow-sm flex-none">
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-3">
          {isSettingsPage && (
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-secondary transition-colors self-start mt-1"
              aria-label={t('button.back', { ns: 'common' })}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex flex-col">
            <h1 className="text-xl font-bold mb-0 mt-0 text-gray-900 dark:text-white tracking-tight leading-tight">
              {getPageTitle()}
            </h1>
            {getPageSubtitle() && (
              <div className="text-sm text-secondary mt-0.5 leading-snug">
                {getPageSubtitle()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!isSettingsPage && (
          <button
            onClick={() => openAddSubscription()}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ease-out",
              "bg-lavender text-white font-medium",
              "hover:bg-lavender-hover hover:shadow-[0_0_15px_rgba(165,166,246,0.3)] hover:-translate-y-px",
              "active:bg-lavender-active active:shadow-none active:translate-y-0 active:scale-[0.99]",
              "focus:ring-2 focus:ring-lavender-light focus:outline-none"
            )}
          >
            <Plus className="w-5 h-5" />
            <span>{t('add', { ns: 'subscription' })}</span>
          </button>
        )}

        <NotificationBell />
        <ThemeToggle />
        <LanguageSwitcher />

        <button 
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ease group',
            'bg-transparent hover:bg-red-50 dark:hover:bg-red-900/10' // Soft red background for logout
          )}
        >
          <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-red-500 dark:group-hover:text-red-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors group-hover:text-red-500 dark:group-hover:text-red-400">
            {t('header.logout', { ns: 'dashboard' })}
          </span>
        </button>
      </div>
    </header>
  );
}
