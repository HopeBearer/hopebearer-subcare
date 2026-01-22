'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { cn } from '@/lib/utils';

export function Header() {
  const { t } = useTranslation('common');
  const { user, logout } = useAuthStore();
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
    <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-40 bg-surface border-b border-base shadow-sm">
      <div className="flex flex-col justify-center">
        <h1 className="text-xl font-bold mb-0 mt-0 text-gray-900 dark:text-white tracking-tight">
          {getPageTitle()}
        </h1>
        {pathname?.includes('/dashboard') && (
          <div className="text-sm mb-0 mt-0 text-secondary">
            {t('header.welcome', { ns: 'dashboard', name: user?.name || 'User' })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        <button 
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ease group',
            'bg-transparent hover:bg-red-50' // Soft red background for logout
          )}
        >
          <LogOut className="w-4 h-4 text-gray-500 transition-colors group-hover:text-red-500" />
          <span className="text-sm font-medium text-gray-700 transition-colors group-hover:text-red-500">
            {t('header.logout', { ns: 'dashboard' })}
          </span>
        </button>
      </div>
    </header>
  );
}
