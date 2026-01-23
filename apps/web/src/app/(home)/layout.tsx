import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import AuthGuard from '@/components/auth-guard';
import { AddSubscriptionModal } from '@/components/features/subscriptions/add-subscription-modal';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-bg-page">
        <Sidebar />
        <main className="flex-1 ml-72 flex flex-col min-h-screen transition-all duration-300">
          <Header />
          <div className="flex-1 p-8 pt-24 overflow-y-auto">
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
