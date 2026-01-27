import { AuthSidebar } from '@/components/auth-sidebar';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex w-full relative">
      {/* Fixed Language Switcher - Positioned relative to viewport/container */}
      <div className="fixed top-6 right-6 sm:top-8 sm:right-8 z-100 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <AuthSidebar />
      {/* Right Form Area - 60% */}
      <div className="w-full lg:w-60pct bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FF] dark:from-gray-900 dark:to-gray-950 relative flex flex-col transition-colors duration-300">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto w-full h-full flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16">
          <div className="w-full max-w-sm space-y-10 my-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
