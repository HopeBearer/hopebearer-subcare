import { SpendingAnomaly } from '@subcare/types';
import { DetectorRecord, DetectorContext } from './types';
import { differenceInDays } from 'date-fns';

/** Bills pending longer than this are flagged */
const LONG_PENDING_THRESHOLD_DAYS = 7;

/**
 * Detect payment-status anomalies.
 * Produces: FAILED_PAYMENT, LONG_PENDING
 */
export function detectPaymentStatusAnomalies(
  records: DetectorRecord[],
  ctx: DetectorContext
): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = [];

  for (const r of records) {
    if (r.status === 'FAILED') {
      anomalies.push(buildFailedAnomaly(r));
    }

    if (r.status === 'PENDING') {
      const daysPending = differenceInDays(ctx.now, r.billingDate);
      if (daysPending >= LONG_PENDING_THRESHOLD_DAYS) {
        anomalies.push(buildLongPendingAnomaly(r, daysPending));
      }
    }
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildFailedAnomaly(r: DetectorRecord): SpendingAnomaly {
  return {
    id: `failed-${r.id}`,
    subscriptionId: r.subscriptionId,
    subscriptionName: r.subscription?.name || 'Unknown',
    type: 'FAILED_PAYMENT',
    severity: 'high',
    date: r.billingDate,
    description: `Payment of ${r.currency} ${r.amount} failed`,
    metadata: { amount: r.amount, currency: r.currency },
  };
}

function buildLongPendingAnomaly(r: DetectorRecord, daysPending: number): SpendingAnomaly {
  const severity = daysPending >= 30 ? 'high' : daysPending >= 14 ? 'medium' : 'low';
  return {
    id: `pending-${r.id}`,
    subscriptionId: r.subscriptionId,
    subscriptionName: r.subscription?.name || 'Unknown',
    type: 'LONG_PENDING',
    severity,
    date: r.billingDate,
    description: `Payment pending for ${daysPending} days (${r.currency} ${r.amount})`,
    metadata: { amount: r.amount, currency: r.currency, daysPending },
  };
}
