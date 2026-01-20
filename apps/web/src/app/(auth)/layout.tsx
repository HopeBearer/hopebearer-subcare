import { AuthSidebar } from '@/components/auth-sidebar';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex w-full">
      <AuthSidebar />
      {/* Right Form Area - 60% */}
      <div className="w-full lg:w-60pct bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FF] flex flex-col justify-center items-center overflow-y-auto p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-sm space-y-10 my-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
