import { SpendingAnomaly } from '@subcare/types';
import { DetectorRecord, DetectorContext } from './types';

/**
 * Detect price changes between consecutive billing records for the same subscription.
 * Produces: PRICE_INCREASE, PRICE_DECREASE
 */
export function detectPriceChanges(
  records: DetectorRecord[],
  _ctx: DetectorContext
): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = [];
  const grouped = groupBySubscription(records.filter(r => r.status === 'PAID'));

  for (const history of grouped.values()) {
    if (history.length < 2) continue;

    // Sort ascending by billingDate for chronological comparison
    history.sort((a, b) => a.billingDate.getTime() - b.billingDate.getTime());

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];

      // Skip cross-currency pairs to avoid false positives
      if (prev.currency !== curr.currency) continue;

      const diff = curr.amount - prev.amount;
      if (Math.abs(diff) < 0.01) continue;

      const isIncrease = diff > 0;
      const percentage = Math.abs((diff / prev.amount) * 100);

      anomalies.push({
        id: `${isIncrease ? 'price-up' : 'price-down'}-${curr.id}`,
        subscriptionId: curr.subscriptionId,
        subscriptionName: curr.subscription?.name || 'Unknown',
        type: isIncrease ? 'PRICE_INCREASE' : 'PRICE_DECREASE',
        severity: percentage >= 30 ? 'high' : percentage >= 10 ? 'medium' : 'low',
        date: curr.billingDate,
        description: isIncrease
          ? `Price increased from ${curr.currency} ${prev.amount} to ${curr.currency} ${curr.amount} (+${percentage.toFixed(1)}%)`
          : `Price decreased from ${curr.currency} ${prev.amount} to ${curr.currency} ${curr.amount} (-${percentage.toFixed(1)}%)`,
        metadata: {
          oldPrice: prev.amount,
          newPrice: curr.amount,
          currency: curr.currency,
          changePercent: Number((isIncrease ? percentage : -percentage).toFixed(1)),
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
