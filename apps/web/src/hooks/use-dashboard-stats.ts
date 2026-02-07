import { useQuery } from '@tanstack/react-query';
import { DashboardService } from '@/services';
import { DashboardStatsResponse } from '@subcare/types';

/**
 * Single shared hook for ALL dashboard data.
 *
 * The backend `GET /dashboard/stats` now returns stats, trend (1y), and
 * distribution in ONE atomic response, guaranteeing data consistency.
 *
 * Every dashboard component should read from this same React Query cache
 * entry instead of fetching independently.
 */
export function useDashboardStats() {
  return useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => DashboardService.getStats(),
  });
}
