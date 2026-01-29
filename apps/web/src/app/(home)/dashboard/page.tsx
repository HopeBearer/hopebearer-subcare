import { PageMeta } from '@/components/common/page-meta';
import { PendingBills } from '@/components/features/dashboard/pending-bills';
import { StatsGrid } from '@/components/features/dashboard/stats-grid';
import { AIRecommendations } from '@/components/features/dashboard/ai-recommendations';
import { DashboardCharts } from '@/components/features/dashboard/charts';
import { UpcomingRenewals } from '@/components/features/dashboard/upcoming-renewals';

export default function DashboardPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageMeta titleKey="metadata.dashboard.title" descriptionKey="metadata.dashboard.description" />
      <PendingBills />
      <StatsGrid />
      <AIRecommendations />
      <DashboardCharts />
      <UpcomingRenewals />
    </div>
  );
}
