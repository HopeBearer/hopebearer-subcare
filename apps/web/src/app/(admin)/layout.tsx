'use client';

import AdminGuard from '@/components/guards/admin-guard';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminHeader } from '@/components/layout/admin-header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden bg-bg-page">
        <AdminSidebar />
        <main className="flex-1 flex flex-col h-full ml-72">
          <AdminHeader />
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
