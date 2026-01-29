'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { 
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store';
import { settingsConfig } from '@/components/settings/config';
import { usePathname } from 'next/navigation';

export function SettingsPageSidebar() {
  const { t } = useTranslation('settings');
  const { activeTab, setActiveTab } = useSettingsStore();
  const pathname = usePathname();

  // Only show this sidebar content if we are on the settings page
  // But wait, the Sidebar component is global. The user request was:
  // "当处于设置页面时，外层的二级路由切换更换为设置的tab切换"
  // This implies the LEFT SIDEBAR should change content when on /settings.
  // The global sidebar is currently apps/web/src/components/layout/sidebar.tsx.
  // I should probably modify the global sidebar to conditionally render content.
  
  return (
     <div className="flex-1 px-4 space-y-2 py-4">
        {settingsConfig.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={(e) => {
                e.preventDefault();
                // Scroll to the element
                const element = document.getElementById(item.id);
                if (element) {
                   // Offset for sticky header if any, usually scroll-mt handles it
                   element.scrollIntoView({ behavior: 'smooth' });
                   // We update state immediately for feedback, though observer will confirm it
                   setActiveTab(item.id);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mb-1 text-left",
                isActive 
                  ? "bg-primary-soft text-primary font-medium shadow-sm" 
                  : "text-secondary hover:bg-primary-pale hover:text-primary dark:hover:bg-gray-800"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-gray-400 group-hover:text-primary")} />
              <span>{t(item.label.replace('settings.', ''), { defaultValue: item.label.split('.').pop() })}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto text-primary" />}
            </button>
          );
        })}
      </div>
  );
}
