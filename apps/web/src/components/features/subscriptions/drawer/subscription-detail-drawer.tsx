'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart2 } from 'lucide-react';
import { DrawerProps } from './types';
import { cn } from '@/lib/utils';
import { SubscriptionHeader } from './subscription-header';
import { SubscriptionInfoSection } from './subscription-info-section';
import { SubscriptionNotifySection } from './subscription-notify-section';
import { SubscriptionHistorySection } from './subscription-history-section';
import { SubscriptionActionBar } from './subscription-action-bar';
import { useTranslation } from 'react-i18next';

export function SubscriptionDetailDrawer({ isOpen, onClose, subscription }: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation(['subscription', 'common']);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      // Double requestAnimationFrame to ensure the DOM is painted (and transitionable) after shouldRender becomes true
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      document.body.style.overflow = '';
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted) return null;
  if (!shouldRender) return null;

  const content = (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out pointer-events-auto",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className={cn(
          "pointer-events-auto relative w-full sm:w-[480px] h-full bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-zinc-100 dark:border-zinc-800 transform transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {subscription ? (
          <>
            <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
              <SubscriptionHeader subscription={subscription} />

              <div className="p-6 space-y-8">
                <SubscriptionInfoSection subscription={subscription} />
                <SubscriptionNotifySection subscription={subscription} />
                
                <SubscriptionHistorySection 
                  subscriptionId={subscription.id} 
                  currency={subscription.currency} 
                  subscriptionName={subscription.name}
                />

                {(subscription.notes || subscription.usage) && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {t('notes_usage', { defaultValue: 'Notes & Usage' })}
                    </h3>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {subscription.notes || t('notes_empty', { defaultValue: 'No notes added.' })}
                      <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center gap-2 text-xs text-zinc-500">
                        <BarChart2 className="w-3 h-3" />
                        <span>{t('usage', { defaultValue: 'Usage' })}: {t(`usage_options.${subscription.usage}`, { defaultValue: subscription.usage })}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <SubscriptionActionBar subscription={subscription} onClose={onClose} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400">
             {t('loading_details', { defaultValue: 'Loading details...' })}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
