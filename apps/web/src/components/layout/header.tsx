'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { useAuthStore } from '@/store/auth.store';
import { useModalStore } from '@/store/modal.store';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Plus } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { cn } from '@/lib/utils';

export function Header() {
  const { t } = useTranslation(['common', 'subscription']);
  const { user, logout } = useAuthStore();
  const { openAddSubscription } = useModalStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Simple title logic based on path
  const getPageTitle = () => {
    if (pathname?.includes('/dashboard')) return t('nav.dashboard');
    if (pathname?.includes('/subscriptions')) return t('nav.subscriptions');
    if (pathname?.includes('/finance')) return t('nav.finance');
    if (pathname?.includes('/notifications')) return t('nav.notifications');
    return t('app_name');
  };

  return (
    <header className="h-20 px-8 flex items-center justify-between fixed top-0 right-0 left-72 z-40 bg-surface border-b border-base shadow-sm">
      <div className="flex flex-col justify-center">
        <h1 className="text-xl font-bold mb-0 mt-0 text-gray-900 dark:text-white tracking-tight">
          {getPageTitle()}
        </h1>
        {(
          <div className="text-sm mb-0 mt-0 text-secondary">
            {t('header.welcome', { ns: 'dashboard', name: user?.name || 'User' })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
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

        <ThemeToggle className="mr-2" />
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
