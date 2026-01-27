'use client';

import { useSettingsStore } from '@/store/settings.store';
import { settingsConfig } from './config';

export function SettingsContainer() {
  const { activeTab } = useSettingsStore();

  const activeTabConfig = settingsConfig.find(tab => tab.id === activeTab) || settingsConfig[0];
  const ActiveComponent = activeTabConfig.component;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="w-full min-w-0">
        <div key={activeTab} className="animate-fade-in">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
