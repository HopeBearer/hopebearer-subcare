import { SubscriptionDTO, MonthlyProjection } from '@subcare/types';
import { addMonths, startOfMonth, format } from 'date-fns';

export interface ProjectionOptions {
  months?: number;
  excludedIds?: string[];
  baseCurrency?: string;
}

export const projectionService = {
  /**
   * Calculate future spending based on active subscriptions
   */
  calculateProjection: (
    subscriptions: SubscriptionDTO[], 
    options: ProjectionOptions = {}
  ): MonthlyProjection[] => {
    const { 
      months = 12, 
      excludedIds = [], 
      baseCurrency = 'CNY' 
    } = options;

    const today = new Date();
    const result: MonthlyProjection[] = [];

    // Exchange rates matching Backend CurrencyService defaults (Base: CNY)
    // Backend (USD=1): CNY=7.23, EUR=0.92 -> 1 USD = 7.23 CNY, 1 EUR = 1.087 USD = 7.86 CNY
    const exchangeRates: Record<string, number> = {
      'USD': 7.23,
      'CNY': 1,
      'EUR': 7.86,
      'JPY': 0.048, // 1/151.5 * 7.23
      'HKD': 0.92,  // 1/7.83 * 7.23
      'GBP': 9.15   // 1/0.79 * 7.23
    };

    for (let i = 0; i < months; i++) {
      const currentMonthDate = addMonths(startOfMonth(today), i);
      const monthKey = format(currentMonthDate, 'yyyy-MM');
      
      let totalAmount = 0;
      const items: MonthlyProjection['items'] = [];

      subscriptions.forEach(sub => {
        // Case insensitive status check
        if (sub.status?.toUpperCase() !== 'ACTIVE' || excludedIds.includes(sub.id)) return;

        // Simplified billing logic
        let shouldCharge = true; 
        const cycle = sub.billingCycle?.toUpperCase() || 'MONTHLY';

        if (cycle === 'YEARLY') {
            // Check if renewal falls in this month
            // If nextPayment is set, use it. Otherwise assume startDate.
            const nextPayment = sub.nextPayment ? new Date(sub.nextPayment) : new Date(sub.startDate);
            if (nextPayment.getMonth() !== currentMonthDate.getMonth()) {
                shouldCharge = false;
            }
        }
        // Add more cycles if needed (WEEKLY, etc. - currently treating others as monthly/always for simplicity)
        
        if (shouldCharge) {
            const rate = exchangeRates[sub.currency] || 1;
            const convertedAmount = Number(sub.price) * rate;
            
            if (convertedAmount > 0) {
                totalAmount += convertedAmount;
                items.push({
                  subscriptionId: sub.id,
                  name: sub.name,
                  amount: Number(convertedAmount.toFixed(2))
                });
            }
        }
      });

      result.push({
        month: monthKey,
        amount: Number(totalAmount.toFixed(2)),
        currency: baseCurrency,
        items
      });
    }

    return result;
  }
};
