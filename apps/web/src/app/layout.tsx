import type { Metadata } from "next";
import { ThemeProvider } from '@/components/providers/theme-provider';
import './globals.scss'
import { I18nProvider } from '@/lib/i18n/provider';
import QueryProvider from '@/components/providers/query-provider';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: "SubCare - Subscription Management",
  description: "Manage your subscriptions efficiently",
};

const i18nConfig = {
  defaultLanguage: 'zh',
  fallbackLanguage: 'en',
  defaultNS: 'common',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body>
        <QueryProvider>
          <I18nProvider config={i18nConfig}>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );  
}
