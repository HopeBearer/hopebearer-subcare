export interface CurrencyImpact {
  currency: string;
  baseCost: number;
  actualCost: number;
  rate: number;
  diff: number;
}

// Deprecated: Logic moved to financial.service.ts and use-analytics.ts
export const analyticsService = {};
