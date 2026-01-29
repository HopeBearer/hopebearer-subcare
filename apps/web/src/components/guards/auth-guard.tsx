'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, accessToken, _hasHydrated } = useAuthStore();
  
  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || !accessToken)) {
      router.replace('/login');
    }
  }, [_hasHydrated, isAuthenticated, accessToken, router]);

  // Show nothing while checking or if not authenticated
  if (!_hasHydrated || !isAuthenticated || !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin w-10 h-10 text-primary-500" />
      </div>
    );
  }

  return <>{children}</>;
}
