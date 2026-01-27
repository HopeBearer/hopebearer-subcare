import { User, Shield, Bell } from 'lucide-react';
import { SettingsTab } from './types';
import { ProfileSettings } from './modules/profile-settings';
import { AccountSettings } from './modules/account-settings';
import { NotificationSettings } from './modules/notification-settings';

export const settingsConfig: SettingsTab[] = [
  {
    id: 'profile',
    label: 'nav.profile',
    icon: User,
    description: 'nav.profile_desc',
    component: ProfileSettings,
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
];
