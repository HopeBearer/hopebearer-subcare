import { Metadata } from 'next';
import { SettingsContainer } from '@/components/settings';

export const metadata: Metadata = {
  title: 'Settings - SubCare',
  description: 'Manage your settings and preferences',
};

export default function SettingsPage() {
  return <SettingsContainer />;
}
