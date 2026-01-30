'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import AuthGuard from '@/components/guards/auth-guard';
import { AddSubscriptionModal } from '@/components/features/subscriptions/add-subscription-modal';
import { useLayoutStore } from '@/store';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/use-socket';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSidebarCollapsed } = useLayoutStore();
  const [mounted, setMounted] = useState(false);
  
  // Initialize socket connection for real-time updates
  useSocket();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by using a fixed width initially or just opacity 0 until mounted
  // But for sidebar, usually we want it visible ASAP.
  // Since we persist state, the server render will likely mismatch if default is false and stored is true.
  // The common strategy is to suppress hydration warning or use a mounted check.
  // If we wait for mounted, the layout shifts.
  // Better approach: use `suppressHydrationWarning` on the element or accept that it might shift.
  // However, since `useLayoutStore` uses `persist`, it might flicker.
  // Let's assume for now the user is okay with a slight shift or we use a "loading" state?
  // Actually, standard practice for persisted UI state is to just render and let it re-render.
  // To avoid `hydration failed` errors, we can use `suppressHydrationWarning` if it was just a div, 
  // but here it is a class.
  // We can use a client-only wrapper or similar.
  // Simplest: just use the store value. If mismatch occurs, Next.js handles it (though with warning in dev).

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-bg-page">
        <Sidebar />
        <main 
          className={cn(
            "flex-1 flex flex-col h-full transition-all duration-300",
            mounted && isSidebarCollapsed ? "ml-20" : "ml-72" // Default to expanded (ml-72) to match server render usually
          )}
        >
          <Header />
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
        <AddSubscriptionModal />
      </div>
    </AuthGuard>
  );
}
