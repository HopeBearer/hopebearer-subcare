import { SpendingAnomaly } from '@subcare/types';
import { DetectorRecord, DetectorContext } from './types';
import { startOfWeek, format } from 'date-fns';

/**
 * Detect duplicate billing: multiple charges for the same subscription
 * within a single billing cycle window.
 * Produces: DUPLICATE_BILLING
 */
export function detectDuplicateBilling(
  records: DetectorRecord[],
  _ctx: DetectorContext
): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = [];

  // Only consider actionable records (PAID + PENDING)
  const activeRecords = records.filter(r => r.status === 'PAID' || r.status === 'PENDING');

  const grouped = groupBySubscription(activeRecords);

  for (const history of grouped.values()) {
    if (history.length < 2) continue;

    const cycle = history[0].subscription?.billingCycle?.toLowerCase() || 'monthly';

    // Bucket records by their billing period key
    const periodBuckets = new Map<string, DetectorRecord[]>();
    for (const r of history) {
      const key = getBillingPeriodKey(r.billingDate, cycle);
      if (!periodBuckets.has(key)) periodBuckets.set(key, []);
      periodBuckets.get(key)!.push(r);
    }

    for (const [period, group] of periodBuckets) {
      if (group.length <= 1) continue;

      // Use the latest record as the anomaly anchor
      group.sort((a, b) => b.billingDate.getTime() - a.billingDate.getTime());
      const latest = group[0];
      const totalAmount = group.reduce((sum, r) => sum + r.amount, 0);

      anomalies.push({
        id: `dup-${latest.id}`,
        subscriptionId: latest.subscriptionId,
        subscriptionName: latest.subscription?.name || 'Unknown',
        type: 'DUPLICATE_BILLING',
        severity: group.length >= 3 ? 'high' : 'medium',
        date: latest.billingDate,
        description: `${group.length} charges in the same ${cycle} period (${period}), totaling ${latest.currency} ${totalAmount.toFixed(2)}`,
        metadata: {
          count: group.length,
          period,
          totalAmount: Number(totalAmount.toFixed(2)),
          currency: latest.currency,
        },
      });
    }
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupBySubscription(records: DetectorRecord[]): Map<string, DetectorRecord[]> {
  const map = new Map<string, DetectorRecord[]>();
  for (const r of records) {
    if (!map.has(r.subscriptionId)) map.set(r.subscriptionId, []);
    map.get(r.subscriptionId)!.push(r);
  }
  return map;
}

/** Map a billing date to a canonical period key based on the subscription's cycle. */
function getBillingPeriodKey(date: Date, cycle: string): string {
  switch (cycle) {
    case 'daily':
      return format(date, 'yyyy-MM-dd');
    case 'weekly': {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      return `W-${format(weekStart, 'yyyy-MM-dd')}`;
    }
    case 'yearly':
      return format(date, 'yyyy');
    case 'monthly':
    default:
      return format(date, 'yyyy-MM');
  }
}
