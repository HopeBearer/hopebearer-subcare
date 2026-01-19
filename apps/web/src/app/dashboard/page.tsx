'use client';

import AuthGuard from '@/components/auth-guard';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Welcome back, {user?.name || user?.email}!
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Total Subscriptions</h3>
              <p className="text-3xl font-bold text-primary-600">12</p>
            </Card>
            <Card>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Monthly Cost</h3>
              <p className="text-3xl font-bold text-primary-600">¥ 328.00</p>
            </Card>
            <Card>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Upcoming Renewals</h3>
              <p className="text-3xl font-bold text-primary-600">3</p>
            </Card>
          </div>

          <Card className="h-96 flex items-center justify-center border-dashed">
            <p className="text-gray-400">Main Content Placeholder</p>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
