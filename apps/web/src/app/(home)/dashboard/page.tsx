'use client';

import { StatsGrid } from '@/components/features/dashboard/stats-grid';
import { AIRecommendations } from '@/components/features/dashboard/ai-recommendations';

export default function DashboardPage() {
  return (
    <div className="space-y-8 pb-12">
      <StatsGrid />
      <AIRecommendations />
    </div>
  );
}
