import { SpendingAnomaly } from '@subcare/types';
import { DetectorRecord, DetectorContext } from './types';
import { format } from 'date-fns';

/** A month is considered a "spike" when spending exceeds this ratio of the average */
const SPIKE_RATIO = 1.5;
/** Need at least this many months of history before spike detection kicks in */
const MIN_MONTHS_FOR_SPIKE = 3;
/** Need at least this many records per subscription for "new high" detection */
const MIN_RECORDS_FOR_HIGH = 3;
/** Minimum percentage above previous max to flag as new high */
const MIN_HIGH_PERCENT = 10;

/**
 * Detect spending-pattern anomalies.
 * Produces: SPENDING_SPIKE, NEW_SPENDING_HIGH
 */
export function detectSpendingPatterns(
  records: DetectorRecord[],
  ctx: DetectorContext
): SpendingAnomaly[] {
  const paidRecords = records.filter(r => r.status === 'PAID');
  return [
    ...detectSpendingSpike(paidRecords, ctx),
    ...detectNewSpendingHigh(paidRecords),
  ];
}

// ---------------------------------------------------------------------------
// SPENDING_SPIKE
// ---------------------------------------------------------------------------

function detectSpendingSpike(records: DetectorRecord[], ctx: DetectorContext): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = [];

  // Aggregate totals per month
  const monthlyTotals = new Map<string, number>();
  for (const r of records) {
    const key = format(r.billingDate, 'yyyy-MM');
    monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + r.amount);
  }

  const sorted = Array.from(monthlyTotals.entries()).sort(([a], [b]) => a.localeCompare(b));
  if (sorted.length < MIN_MONTHS_FOR_SPIKE) return anomalies;

  // Compare each month against the rolling average of all preceding months
  for (let i = 1; i < sorted.length; i++) {
    const [monthKey, total] = sorted[i];
    const prevSlice = sorted.slice(0, i);
    const avg = prevSlice.reduce((s, [, v]) => s + v, 0) / prevSlice.length;
    if (avg <= 0) continue;

    const ratio = total / avg;
    if (ratio < SPIKE_RATIO) continue;

    const overPercent = (ratio - 1) * 100;
    anomalies.push({
      id: `spike-${monthKey}`,
      subscriptionName: 'Total Spending',
      type: 'SPENDING_SPIKE',
      severity: ratio >= 2 ? 'high' : 'medium',
      date: `${monthKey}-01`,
      description: `Spending in ${monthKey} was ${overPercent.toFixed(0)}% above average (${total.toFixed(2)} vs avg ${avg.toFixed(2)})`,
      metadata: {
        month: monthKey,
        amount: Number(total.toFixed(2)),
        average: Number(avg.toFixed(2)),
        ratio: Number(ratio.toFixed(2)),
        currency: records[0]?.currency,
      },
    });
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// NEW_SPENDING_HIGH
// ---------------------------------------------------------------------------

function detectNewSpendingHigh(records: DetectorRecord[]): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = [];

  const grouped = new Map<string, DetectorRecord[]>();
  for (const r of records) {
    if (!grouped.has(r.subscriptionId)) grouped.set(r.subscriptionId, []);
    grouped.get(r.subscriptionId)!.push(r);
  }

  for (const history of grouped.values()) {
    if (history.length < MIN_RECORDS_FOR_HIGH) continue;

    history.sort((a, b) => a.billingDate.getTime() - b.billingDate.getTime());

    const latest = history[history.length - 1];
    const previousMax = Math.max(...history.slice(0, -1).map(r => r.amount));
    if (previousMax <= 0 || latest.amount <= previousMax) continue;

    const increasePercent = ((latest.amount - previousMax) / previousMax) * 100;
    if (increasePercent < MIN_HIGH_PERCENT) continue;

    anomalies.push({
      id: `high-${latest.id}`,
      subscriptionId: latest.subscriptionId,
      subscriptionName: latest.subscription?.name || 'Unknown',
      type: 'NEW_SPENDING_HIGH',
      severity: increasePercent >= 50 ? 'high' : 'medium',
      date: latest.billingDate,
      description: `New all-time high: ${latest.currency} ${latest.amount} (+${increasePercent.toFixed(1)}% above previous max ${previousMax})`,
      metadata: {
        amount: latest.amount,
        previousMax,
        increasePercent: Number(increasePercent.toFixed(1)),
        currency: latest.currency,
      },
    });
  }

  return anomalies;
}
