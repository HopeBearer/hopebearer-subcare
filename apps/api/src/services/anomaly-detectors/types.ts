/**
 * Normalized types for anomaly detectors.
 * All Decimal values are pre-converted to plain numbers before entering detectors.
 */

export interface DetectorRecord {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  billingDate: Date;
  status: string; // PAID | PENDING | FAILED | REFUNDED
  createdAt: Date;
  subscription: {
    id: string;
    name: string;
    billingCycle: string;
    normalizedName: string;
    status: string;
    categoryId: string | null;
    category: {
      id: string;
      name: string;
      budgetLimit: number | null;
    } | null;
  } | null;
}

export interface DetectorSubscription {
  id: string;
  name: string;
  normalizedName: string;
  status: string;
  price: number;
  currency: string;
  billingCycle: string;
  categoryId: string | null;
}

export interface DetectorCategory {
  id: string;
  name: string;
  budgetLimit: number | null;
}

export interface DetectorContext {
  baseCurrency: string;
  now: Date;
}
