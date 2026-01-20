'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/hooks';

const LANGUAGES = [
  { code: 'zh', labelKey: 'languages.zh' },
  { code: 'en', labelKey: 'languages.en' },
  { code: 'ja', labelKey: 'languages.ja' },
] as const;

export interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t, i18n, changeLanguage } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Normalize language code (e.g., 'zh-CN' -> 'zh')
  const currentLangCode = i18n.resolvedLanguage || i18n.language?.split('-')[0] || 'zh';
  
  const handleLanguageChange = (code: string) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  const currentLangLabel = t(`languages.${currentLangCode}`) || LANGUAGES.find(l => l.code === currentLangCode)?.labelKey;

  return (
    <div className={cn('relative z-50', className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 group',
          'hover:bg-primary/10', // Soft purple background on hover
          isOpen ? 'bg-primary/10' : 'bg-transparent'
        )}
        aria-label="Switch Language"
        aria-expanded={isOpen}
      >
        <Globe
          className={cn(
            'w-4 h-4 text-gray-500 transition-colors',
            'group-hover:text-primary',
            isOpen ? 'text-primary' : ''
          )}
        />
        <span
          className={cn(
            'text-sm font-medium text-gray-700 transition-colors',
            'group-hover:text-primary',
            isOpen ? 'text-primary' : ''
          )}
        >
          {currentLangLabel}
        </span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <div
        className={cn(
          'absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-lg ring-1 ring-black/5 py-1 overflow-hidden origin-top-right transition-all duration-200',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 visible'
            : 'opacity-0 scale-95 -translate-y-2 invisible'
        )}
      >
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              'w-full text-left px-4 py-1 text-sm flex items-center justify-between transition-colors',
              'hover:bg-gray-50',
              currentLangCode === lang.code
                ? 'text-primary font-medium bg-primary/5'
                : 'text-gray-600'
            )}
          >
            <span>{t(lang.labelKey)}</span>
            {currentLangCode === lang.code && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}
