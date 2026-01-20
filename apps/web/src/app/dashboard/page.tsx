'use client';

import AuthGuard from '@/components/auth-guard';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { t, changeLanguage, language } = useTranslation('dashboard');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('header.title')}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {t('header.welcome', { name: user?.name || user?.email })}
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <div className="flex gap-2">
                <Button 
                  variant={language === 'zh' ? 'primary' : 'outline'} 
                  onClick={() => changeLanguage('zh')}
                >
                  中文
                </Button>
                <Button 
                  variant={language === 'en' ? 'primary' : 'outline'} 
                  onClick={() => changeLanguage('en')}
                >
                  English
                </Button>
                <Button 
                  variant={language === 'ja' ? 'primary' : 'outline'} 
                  onClick={() => changeLanguage('ja')}
                >
                  日本語
                </Button>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                {t('header.logout')}
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('stats.total_subscriptions')}</h3>
              <p className="text-3xl font-bold text-primary-600">12</p>
            </Card>
            <Card>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('stats.monthly_cost')}</h3>
              <p className="text-3xl font-bold text-primary-600">¥ 328.00</p>
            </Card>
            <Card>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('stats.upcoming_renewals')}</h3>
              <p className="text-3xl font-bold text-primary-600">3</p>
            </Card>
          </div>

          <Card className="h-96 flex items-center justify-center border-dashed">
            <p className="text-gray-400">{t('content.placeholder')}</p>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
