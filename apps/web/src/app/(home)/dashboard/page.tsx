'use client';

import { StatsGrid } from '@/components/features/dashboard/stats-grid';
import { AIRecommendations } from '@/components/features/dashboard/ai-recommendations';
import { DashboardCharts } from '@/components/features/dashboard/charts';
import { UpcomingRenewals } from '@/components/features/dashboard/upcoming-renewals';

export default function DashboardPage() {
  return (
    <div className="space-y-8 pb-12">
      <StatsGrid />
      <AIRecommendations />
      <DashboardCharts />
      <UpcomingRenewals />
    </div>
  );
}
