import { create } from 'zustand';
import { SettingsTabId } from '@/components/settings/types';

interface SettingsState {
  activeTab: SettingsTabId;
  setActiveTab: (tab: SettingsTabId) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  activeTab: 'profile',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
