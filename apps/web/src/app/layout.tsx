import type { Metadata } from "next";
import { ThemeProvider } from '@/components/providers/theme-provider';
import './globals.scss'
import { I18nProvider } from '@/lib/i18n/provider';
import QueryProvider from '@/components/providers/query-provider';
import { Toaster } from 'sonner';
import localFont from 'next/font/local';
import { TooltipProvider } from "@/components/ui/tooltip";

const zhimang = localFont({
  src: '../../public/fonts/ZhiMangXing-Regular.ttf',
  variable: '--font-zhimang',
  display: 'swap',
  weight: '400',
  style: 'normal',
});

const sourGummy = localFont({
  src: '../../public/fonts/SourGummy-VariableFont_wdth,wght.ttf',
  variable: '--font-sour-gummy',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "SubCare - Subscription Manager",
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
    <html lang="zh" suppressHydrationWarning className={`${zhimang.variable} ${sourGummy.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storage = localStorage.getItem('subcare-theme');
                  var theme = 'light';
                  if (storage) {
                    try {
                      var parsed = JSON.parse(storage);
                      if (parsed.state && parsed.state.theme) {
                        theme = parsed.state.theme;
                      }
                    } catch (e) {}
                  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    theme = 'dark';
                  }
                  
                  var root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  root.classList.add(theme);
                  root.style.colorScheme = theme;

                  // Language initialization
                  var lang = localStorage.getItem('i18nextLng') || 'zh';
                  root.lang = lang;
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body>
        <QueryProvider>
          <I18nProvider config={i18nConfig}>
            <ThemeProvider>
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </ThemeProvider>
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );  
}
