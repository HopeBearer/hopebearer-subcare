'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, accessToken, user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || !accessToken)) {
      router.replace('/login');
    }
  }, [_hasHydrated, isAuthenticated, accessToken, router]);

  // Loading state
  if (!_hasHydrated || !isAuthenticated || !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin w-10 h-10 text-primary-500" />
      </div>
    );
  }

  // Not admin — show 403
  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4">
        <ShieldAlert className="w-16 h-16 text-red-400" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">403 - Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400">You do not have permission to access the admin panel.</p>
        <button
          onClick={() => window.close()}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
