import { User, Shield, Bell, Settings, BrainCircuit } from 'lucide-react';
import { SettingsTab } from './types';
import { ProfileSettings } from './modules/profile-settings';
import { AccountSettings } from './modules/account-settings';
import { NotificationSettings } from './modules/notification-settings';
import { PreferencesSettings } from './modules/preferences-settings';
import { ApiSettings } from './modules/api-settings';

export const settingsConfig: SettingsTab[] = [
  {
    id: 'profile',
    label: 'nav.profile',
    icon: User,
    description: 'nav.profile_desc',
    component: ProfileSettings,
  },
  {
    id: 'preferences',
    label: 'nav.preferences',
    icon: Settings,
    description: 'nav.preferences_desc',
    component: PreferencesSettings,
  },
  {
    id: 'account',
    label: 'nav.account',
    icon: Shield,
    description: 'nav.account_desc',
    component: AccountSettings,
  },
  {
    id: 'notifications',
    label: 'nav.notifications',
    icon: Bell,
    description: 'nav.notifications_desc',
    component: NotificationSettings,
  },
  {
    id: 'api',
    label: 'nav.api',
    icon: BrainCircuit,
    description: 'nav.api_desc',
    component: ApiSettings,
  },
];
