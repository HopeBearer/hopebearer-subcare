import { SpendingAnomaly } from '@subcare/types';
import { DetectorRecord, DetectorSubscription, DetectorCategory, DetectorContext } from './types';
import { detectPriceChanges } from './price-change.detector';
import { detectDuplicateBilling } from './duplicate-billing.detector';
import { detectPaymentStatusAnomalies } from './payment-status.detector';
import { detectSpendingPatterns } from './spending-pattern.detector';
import { detectSubscriptionHealthAnomalies } from './subscription-health.detector';

export interface AnomalyDetectionInput {
  /** All payment records from past 12 months (all statuses), amounts pre-converted to numbers */
  records: DetectorRecord[];
  /** Active subscriptions for overlap detection */
  activeSubscriptions: DetectorSubscription[];
  /** User's categories with budget limits */
  categories: DetectorCategory[];
  /** Detection context */
  context: DetectorContext;
}

/**
 * Run all anomaly detectors independently (atomic).
 * Each detector is isolated — a failure in one does not affect others.
 */
export function runAllDetectors(input: AnomalyDetectionInput): SpendingAnomaly[] {
  const { records, activeSubscriptions, categories, context } = input;
  const allAnomalies: SpendingAnomaly[] = [];

  const detectors: Array<{ name: string; run: () => SpendingAnomaly[] }> = [
    { name: 'PriceChange', run: () => detectPriceChanges(records, context) },
    { name: 'DuplicateBilling', run: () => detectDuplicateBilling(records, context) },
    { name: 'PaymentStatus', run: () => detectPaymentStatusAnomalies(records, context) },
    { name: 'SpendingPattern', run: () => detectSpendingPatterns(records, context) },
    {
      name: 'SubscriptionHealth',
      run: () => detectSubscriptionHealthAnomalies(records, activeSubscriptions, categories, context),
    },
  ];

  for (const detector of detectors) {
    try {
      allAnomalies.push(...detector.run());
    } catch (error) {
      // Atomic: one detector failure must not break the entire pipeline
      console.error(`[AnomalyDetector] ${detector.name} failed:`, error);
    }
  }

  // Sort: severity (high → low), then date (newest first)
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  allAnomalies.sort((a, b) => {
    const sevDiff = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return allAnomalies;
}

// Re-export types for convenience
export type { DetectorRecord, DetectorSubscription, DetectorCategory, DetectorContext };
