import { useState, useEffect, useCallback } from 'react';
import { projectionService, ProjectionOptions } from '@/lib/logic/projection';
import { SubscriptionDTO, HeatmapItem, MonthlyProjection, SpendingAnomaly, SankeyData } from '@subcare/types';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { financialService } from '@/services';

// --- Shared Overview Hook ---
export function useFinancialOverview(excludedIds: string[] = []) {
  return useQuery({
    queryKey: ['financial', 'overview', excludedIds.join(',')],
    queryFn: () => financialService.getOverview(excludedIds),
    placeholderData: keepPreviousData // Keep showing old data while refetching to avoid flicker
  });
}

// --- Individual Hooks deriving data from Overview ---

export function useFinancialSummary() {
  // Summary usually needs the "full" picture (no exclusions) OR the simulated picture?
  // The Summary Card shows "Projected Annual Total". This SHOULD reflect the simulation.
  // BUT the "YTD Expense" should be actuals.
  // Our backend logic now handles this: YTD is always actual, Projected is filtered.
  // However, we need to know if we are in "Simulation Mode".
  // Currently, the page components call these hooks without arguments.
  // To support simulation across components, we might need a context or just pass props.
  // For now, let's keep the default behavior (no params) for the initial load.
  const { data, isLoading, error } = useFinancialOverview([]);
  return {
    data: {
      totalExpense: data?.totalExpense || 0,
      projectedTotal: data?.projectedTotal || 0,
      currency: data?.currency || 'CNY'
    },
    isLoading,
    error
  };
}
// ... (Heatmap, Anomalies, Sankey similar - they use default overview)

/**
 * Projection Hook
 * 
 * NOW USES SERVER-SIDE CALCULATION
 */
export function useProjection(subscriptions: SubscriptionDTO[]) {
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  
  // We fetch the overview specifically for this projection with exclusions
  const { data: overviewData, isLoading } = useFinancialOverview(excludedIds);

  const toggleSubscription = useCallback((id: string) => {
    setExcludedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  return {
    projection: overviewData?.projection || [],
    excludedIds,
    toggleSubscription,
    isLoading
  };
}

export function useSpendingHeatmap(year: number) {
  const { data, isLoading, error } = useFinancialOverview();
  
  // Note: Backend currently returns data for "current year" implicitly. 
  // 'year' param is ignored by backend currently but kept for future API support.
  
  return {
    data: data?.heatmap || [],
    isLoading,
    error
  };
}

export function useCurrencyImpact() {
  // Not implemented in backend yet, returning mock for now or null
  return {
    data: null, 
    isLoading: false 
  };
}

export function useAnomalies() {
  const { data, isLoading, error } = useFinancialOverview();
  return {
    data: data?.anomalies || [],
    isLoading,
    error
  };
}

export function useSankeyData() {
    const { data, isLoading, error } = useFinancialOverview();
    return {
        data: data?.sankey,
        isLoading,
    error
  };
}
