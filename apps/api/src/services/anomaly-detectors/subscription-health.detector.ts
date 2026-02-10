import { SpendingAnomaly } from '@subcare/types';
import { DetectorRecord, DetectorSubscription, DetectorCategory, DetectorContext } from './types';
import { startOfMonth, endOfMonth, format } from 'date-fns';

/**
 * Detect subscription-health anomalies.
 * Produces: CURRENCY_CHANGE, SUBSCRIPTION_OVERLAP, BUDGET_EXCEEDED
 */
export function detectSubscriptionHealthAnomalies(
  records: DetectorRecord[],
  subscriptions: DetectorSubscription[],
  categories: DetectorCategory[],
  ctx: DetectorContext
): SpendingAnomaly[] {
  return [
    ...detectCurrencyChanges(records),
    ...detectSubscriptionOverlap(subscriptions),
    ...detectBudgetExceeded(records, categories, ctx),
  ];
}

// ---------------------------------------------------------------------------
// CURRENCY_CHANGE
// ---------------------------------------------------------------------------

function detectCurrencyChanges(records: DetectorRecord[]): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = [];
  const paidRecords = records.filter(r => r.status === 'PAID');

  const grouped = groupBySubscription(paidRecords);

  for (const history of grouped.values()) {
    if (history.length < 2) continue;
    history.sort((a, b) => a.billingDate.getTime() - b.billingDate.getTime());

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      if (prev.currency === curr.currency) continue;

      anomalies.push({
        id: `currency-${curr.id}`,
        subscriptionId: curr.subscriptionId,
        subscriptionName: curr.subscription?.name || 'Unknown',
        type: 'CURRENCY_CHANGE',
        severity: 'medium',
        date: curr.billingDate,
        description: `Billing currency changed from ${prev.currency} to ${curr.currency}`,
        metadata: {
          oldCurrency: prev.currency,
          newCurrency: curr.currency,
          oldAmount: prev.amount,
          newAmount: curr.amount,
        },
      });
    }
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// SUBSCRIPTION_OVERLAP
// ---------------------------------------------------------------------------

function detectSubscriptionOverlap(subscriptions: DetectorSubscription[]): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = [];

  // Group active subscriptions by normalizedName
  const nameGroups = new Map<string, DetectorSubscription[]>();
  for (const sub of subscriptions) {
    const key = (sub.normalizedName || sub.name.toLowerCase().trim());
    if (!key) continue;
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key)!.push(sub);
  }

  for (const group of nameGroups.values()) {
    if (group.length <= 1) continue;

    anomalies.push({
      id: `overlap-${group.map(s => s.id).sort().join('-').slice(0, 60)}`,
      subscriptionName: group[0].name,
      type: 'SUBSCRIPTION_OVERLAP',
      severity: group.length >= 3 ? 'high' : 'medium',
      date: new Date(),
      description: `${group.length} active subscriptions appear to be the same service: ${group.map(s => s.name).join(', ')}`,
      metadata: {
        count: group.length,
        subscriptionIds: group.map(s => s.id),
        names: group.map(s => s.name),
      },
    });
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// BUDGET_EXCEEDED
// ---------------------------------------------------------------------------

function detectBudgetExceeded(
  records: DetectorRecord[],
  categories: DetectorCategory[],
  ctx: DetectorContext
): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = [];

  const budgeted = categories.filter(c => c.budgetLimit && c.budgetLimit > 0);
  if (budgeted.length === 0) return anomalies;

  const monthStart = startOfMonth(ctx.now);
  const monthEnd = endOfMonth(ctx.now);
  const monthKey = format(ctx.now, 'yyyy-MM');

  // Sum PAID records for the current month by categoryId
  const categorySpending = new Map<string, number>();
  for (const r of records) {
    if (r.status !== 'PAID') continue;
    if (r.billingDate < monthStart || r.billingDate > monthEnd) continue;
    const catId = r.subscription?.categoryId;
    if (!catId) continue;
    categorySpending.set(catId, (categorySpending.get(catId) || 0) + r.amount);
  }

  for (const cat of budgeted) {
    const spent = categorySpending.get(cat.id) || 0;
    const limit = cat.budgetLimit!;
    if (spent <= limit) continue;

    const overPercent = ((spent - limit) / limit) * 100;
    anomalies.push({
      id: `budget-${cat.id}-${monthKey}`,
      subscriptionName: cat.name,
      type: 'BUDGET_EXCEEDED',
      severity: overPercent >= 50 ? 'high' : 'medium',
      date: ctx.now,
      description: `${cat.name} spending this month: ${spent.toFixed(2)}, exceeding budget of ${limit.toFixed(2)} by ${overPercent.toFixed(0)}%`,
      metadata: {
        categoryId: cat.id,
        categoryName: cat.name,
        spent: Number(spent.toFixed(2)),
        limit,
        overPercent: Number(overPercent.toFixed(1)),
      },
    });
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
