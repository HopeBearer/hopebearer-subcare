'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { 
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore, useLayoutStore } from '@/store';
import { settingsConfig } from '@/components/settings/config';

export function SettingsPageSidebar() {
  const { t } = useTranslation('settings');
  const { activeTab, setActiveTab } = useSettingsStore();
  const { isSidebarCollapsed } = useLayoutStore();

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
                const element = document.getElementById(item.id);
                if (element) {
                   element.scrollIntoView({ behavior: 'smooth' });
                   setActiveTab(item.id);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mb-1 text-left",
                isActive 
                  ? "bg-primary-soft text-primary font-medium shadow-sm" 
                  : "text-secondary hover:bg-primary-pale hover:text-primary dark:hover:bg-gray-800",
                isSidebarCollapsed && "justify-center px-2 gap-0"
              )}
              title={isSidebarCollapsed ? t(item.label.replace('settings.', ''), { defaultValue: item.label.split('.').pop() }) : undefined}
            >
              <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-gray-400 group-hover:text-primary")} />
              <span className={cn(
                "transition-all duration-300 whitespace-nowrap overflow-hidden",
                isSidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                {t(item.label.replace('settings.', ''), { defaultValue: item.label.split('.').pop() })}
              </span>
              {!isSidebarCollapsed && isActive && <ChevronRight className="w-4 h-4 ml-auto text-primary" />}
            </button>
          );
        })}
      </div>
  );
}
