import { LucideIcon } from 'lucide-react';
import { ComponentType } from 'react';

export type SettingsTabId = 'profile' | 'account' | 'notifications' | 'security' | 'billing';

export interface SettingsTab {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
  description?: string;
  component: ComponentType;
}
