'use client';

import { StatsGrid } from '@/components/features/dashboard/stats-grid';
import { AIRecommendations } from '@/components/features/dashboard/ai-recommendations';
import { DashboardCharts } from '@/components/features/dashboard/charts';

export default function DashboardPage() {
  return (
    <div className="space-y-8 pb-12">
      <StatsGrid />
      <AIRecommendations />
      <DashboardCharts />
    </div>
  );
}
