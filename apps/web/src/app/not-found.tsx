'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center space-y-6 max-w-md mx-auto">
        {/* Illustration Container */}
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 bg-lavender/20 rounded-full animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FileQuestion className="w-16 h-16 text-lavender" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            404
          </h1>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {t('not_found_page.title')}
          </h2>
          <p className="text-secondary dark:text-gray-400 text-sm leading-relaxed">
            {t('not_found_page.description')}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4 flex justify-center">
          <Link href="/">
            <Button 
              className="bg-lavender hover:bg-lavender-hover text-white font-medium px-8 py-3 text-base rounded-xl shadow-lg shadow-lavender/20 transition-all duration-200 hover:-translate-y-1"
            >
              {t('not_found_page.back_home')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
