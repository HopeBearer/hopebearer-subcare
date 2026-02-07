import { SubscriptionRepository } from "../repositories/SubscriptionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { CurrencyService } from "../services/CurrencyService";
import { PaymentRecordRepository } from "../repositories/PaymentRecordRepository";
import { CategoryRepository } from "../repositories/CategoryRepository";
import { DashboardStatsResponse, ExpenseTrendData, CategoryDistributionData } from "@subcare/types";
import { calculateMonthlyEquivalent } from "../utils/billing-utils";

export class DashboardService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private userRepository: UserRepository,
    private currencyService: CurrencyService,
    private paymentRecordRepository: PaymentRecordRepository = new PaymentRecordRepository(),
    private categoryRepository: CategoryRepository = new CategoryRepository()
  ) {}

  private formatMoney(amount: number, currency: string = 'CNY'): string {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'code',
    }).format(amount);
  }

  /**
   * Core method: fetches ALL base data in a single Promise.all to ensure atomicity,
   * then derives all stats, trend, and distribution from the same snapshot.
   */
  async getStats(userId: string): Promise<DashboardStatsResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const userCurrency = user.currency || 'CNY';
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // === ATOMIC FETCH: all base data in a single parallel query ===
    // Precompute the 12-month date ranges
    const monthRanges: Array<{ start: Date; end: Date; label: string }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      monthRanges.push({ start: d, end: e, label: `${year}-${month}` });
    }

    // Build all DB queries in parallel
    const [
      lastMonthRecords,
      activeSubs,
      dbCategories,
      renewals,
      ...monthlyRecordsArr
    ] = await Promise.all([
      this.paymentRecordRepository.findByUserIdAndDateRange(userId, startOfLastMonth, endOfLastMonth),
      this.subscriptionRepository.findActiveByUserId(userId),
      this.categoryRepository.findAllByUserId(userId),
      this.subscriptionRepository.findUpcomingRenewals(userId, 7),
      ...monthRanges.map(r => this.paymentRecordRepository.findByUserIdAndDateRange(userId, r.start, r.end))
    ]);

    // === SHARED HELPER ===
    const sumRecords = async (records: any[]) => {
      let total = 0;
      for (const record of records) {
        let amount = Number(record.amount);
        if (record.currency !== userCurrency) {
          amount = await this.currencyService.convert(amount, record.currency, userCurrency);
        }
        total += amount;
      }
      return total;
    };

    // === 1. EXPENSE HISTORY (12 months) — same data feeds sparkline + trend chart ===
    const historyLabels: string[] = [];
    const historyValues: number[] = [];
    for (let i = 0; i < monthRanges.length; i++) {
      historyLabels.push(monthRanges[i].label);
      const total = await sumRecords(monthlyRecordsArr[i]);
      historyValues.push(Number(total.toFixed(2)));
    }

    // Current month is the LAST entry in the array
    const currentMonthTotal = historyValues[historyValues.length - 1];
    const lastMonthTotal = await sumRecords(lastMonthRecords);

    // Calculate expense from soft-deleted subscriptions (deletedAt != null) in current month
    const currentMonthRecords = monthlyRecordsArr[monthlyRecordsArr.length - 1];
    let deletedSubExpense = 0;
    for (const record of currentMonthRecords) {
      const sub = (record as any).subscription;
      if (sub && sub.deletedAt != null) {
        let amount = Number(record.amount);
        if (record.currency !== userCurrency) {
          amount = await this.currencyService.convert(amount, record.currency, userCurrency);
        }
        deletedSubExpense += amount;
      }
    }

    // Trend calculation
    const trendDiff = currentMonthTotal - lastMonthTotal;
    const trendPercentage = lastMonthTotal > 0
      ? (trendDiff / lastMonthTotal) * 100
      : (currentMonthTotal > 0 ? 100 : 0);

    // === 2. ACTIVE SUBSCRIPTIONS ===
    const activeCount = activeSubs.length;
    const newCount = activeSubs.filter(s => s.createdAt >= startOfCurrentMonth).length;

    // === 3a. SUBSCRIPTION PORTFOLIO DISTRIBUTION (monthly-equivalent, for StatsGrid small pie) ===
    const categoryColorMap = new Map<string, string>();
    dbCategories.forEach(cat => {
      categoryColorMap.set(cat.name.toLowerCase(), cat.color || '#9CA3AF');
    });

    let subPortfolioTotal = 0;
    const subPortfolioMap = new Map<string, { value: number; count: number }>();

    // Also accumulate per-cycle breakdown for the equivalent expense flip card
    const equivalentCycleMap = new Map<string, { amount: number; count: number }>();

    const portfolioResults = await Promise.all(activeSubs.map(async (sub) => {
      const cat = (sub as any).category || 'Other';
      const price = Number(sub.price);
      const convertedPrice = await this.currencyService.convert(price, sub.currency, userCurrency);
      const amount = calculateMonthlyEquivalent(convertedPrice, sub.billingCycle);
      return { cat, amount, cycle: sub.billingCycle };
    }));

    portfolioResults.forEach(({ cat, amount, cycle }) => {
      subPortfolioTotal += amount;
      const existing = subPortfolioMap.get(cat) || { value: 0, count: 0 };
      subPortfolioMap.set(cat, {
        value: existing.value + amount,
        count: existing.count + 1
      });

      // Per-cycle breakdown
      const normalizedCycle = cycle?.toLowerCase() || 'monthly';
      const cycleEntry = equivalentCycleMap.get(normalizedCycle) || { amount: 0, count: 0 };
      equivalentCycleMap.set(normalizedCycle, {
        amount: cycleEntry.amount + amount,
        count: cycleEntry.count + 1
      });
    });

    const portfolioDistribution = Array.from(subPortfolioMap.entries()).map(([name, data]) => ({
      id: name,
      name,
      percentage: subPortfolioTotal > 0 ? parseFloat(((data.value / subPortfolioTotal) * 100).toFixed(1)) : 0,
      color: categoryColorMap.get(name.toLowerCase()) || '#9CA3AF'
    })).sort((a, b) => b.percentage - a.percentage);

    const categoryCount = portfolioDistribution.length;

    // === 3b. ACTUAL SPENDING DISTRIBUTION (from payment records, for large pie chart) ===
    // Uses the SAME payment records that feed the trend chart (12 months)
    const allRecords = monthlyRecordsArr.flat();
    let actualDistTotal = 0;
    const actualDistMap = new Map<string, { value: number; count: number }>();

    for (const record of allRecords) {
      const sub = (record as any).subscription;
      // sub.category is the Prisma relation (Category object), sub.categoryName is the string
      const cat = sub?.category?.name || sub?.categoryName || 'Other';
      let amount = Number(record.amount);
      if (record.currency !== userCurrency) {
        amount = await this.currencyService.convert(amount, record.currency, userCurrency);
      }
      actualDistTotal += amount;
      const existing = actualDistMap.get(cat) || { value: 0, count: 0 };
      actualDistMap.set(cat, {
        value: existing.value + amount,
        count: existing.count + 1
      });
    }

    const actualDistribution: CategoryDistributionData = Array.from(actualDistMap.entries()).map(([name, data]) => ({
      id: name,
      name,
      value: Number(data.value.toFixed(2)),
      count: data.count,
      percentage: actualDistTotal > 0 ? parseFloat(((data.value / actualDistTotal) * 100).toFixed(1)) : 0,
      color: categoryColorMap.get(name.toLowerCase()) || '#9CA3AF'
    })).sort((a, b) => b.value - a.value);

    // === 4. BUDGET ===
    const budgetLimit = Number(user.monthlyBudget) || 0;
    const remaining = budgetLimit - currentMonthTotal;
    const usedPercentage = budgetLimit > 0 ? Math.round((currentMonthTotal / budgetLimit) * 100) : 0;

    // === 5. RENEWALS ===
    const nextRenewalSub = renewals[0] || null;
    let nextRenewalData = null;
    if (nextRenewalSub && nextRenewalSub.nextPayment) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const paymentDate = new Date(nextRenewalSub.nextPayment);
      paymentDate.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(paymentDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      nextRenewalData = {
        name: nextRenewalSub.name,
        price: {
          amount: Number(nextRenewalSub.price),
          currency: nextRenewalSub.currency,
          formatted: this.formatMoney(Number(nextRenewalSub.price), nextRenewalSub.currency)
        },
        cycle: '/' + (nextRenewalSub.billingCycle === 'monthly' ? 'Month' : 'Year'),
        daysRemaining: diffDays
      };
    }

    return {
      expenses: {
        total: {
          amount: currentMonthTotal,
          currency: userCurrency,
          formatted: this.formatMoney(currentMonthTotal, userCurrency)
        },
        deletedExpense: {
          amount: Number(deletedSubExpense.toFixed(2)),
          currency: userCurrency,
          formatted: this.formatMoney(deletedSubExpense, userCurrency)
        },
        equivalentExpense: {
          amount: Number(subPortfolioTotal.toFixed(2)),
          currency: userCurrency,
          formatted: this.formatMoney(subPortfolioTotal, userCurrency)
        },
        trend: {
          percentage: Number(trendPercentage.toFixed(1)),
          direction: trendDiff > 0 ? 'up' : (trendDiff < 0 ? 'down' : 'flat'),
          diffAmount: {
            amount: Math.abs(trendDiff),
            currency: userCurrency,
            formatted: this.formatMoney(Math.abs(trendDiff), userCurrency)
          }
        },
        history: historyValues,
        equivalentBreakdown: Array.from(equivalentCycleMap.entries()).map(([cycle, data]) => ({
          cycle,
          amount: Number(data.amount.toFixed(2)),
          count: data.count
        })).sort((a, b) => b.amount - a.amount)
      },
      subscriptions: {
        activeCount,
        newCount,
        categoryCount,
        categories: portfolioDistribution
      },
      budget: {
        totalLimit: {
          amount: budgetLimit,
          currency: userCurrency,
          formatted: this.formatMoney(budgetLimit, userCurrency)
        },
        remaining: {
          amount: remaining,
          currency: userCurrency,
          formatted: this.formatMoney(remaining, userCurrency)
        },
        usedPercentage,
        status: usedPercentage > 100 ? 'exceeded' : (usedPercentage > 85 ? 'warning' : 'safe')
      },
      renewals: {
        upcomingCount: renewals.length,
        daysThreshold: 7,
        nextRenewal: nextRenewalData
      },
      // === NEW: Include trend + distribution in the single response ===
      trend: {
        labels: historyLabels,
        values: historyValues,
        currency: userCurrency
      },
      distribution: actualDistribution
    };
  }

  /**
   * Standalone trend endpoint — only needed when user switches period (6m/all).
   * For the default 1y period, the data is already included in getStats().
   */
  async getExpenseTrend(userId: string, period: '6m' | '1y' | 'all'): Promise<ExpenseTrendData> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    const userCurrency = user.currency || 'CNY';

    const monthsBack = period === '6m' ? 6 : (period === '1y' ? 12 : 24);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack + 1);
    startDate.setDate(1);

    const labels: string[] = [];
    const values: number[] = [];

    for (let i = 0; i < monthsBack; i++) {
      const currentMonth = new Date(startDate);
      currentMonth.setMonth(startDate.getMonth() + i);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      const monthLabel = `${year}-${month}`;

      const records = await this.paymentRecordRepository.findByUserIdAndDateRange(
        userId, currentMonth, endOfMonth
      );

      let monthlyTotal = 0;
      for (const record of records) {
        let amount = Number(record.amount);
        if (record.currency !== userCurrency) {
          amount = await this.currencyService.convert(amount, record.currency, userCurrency);
        }
        monthlyTotal += amount;
      }

      labels.push(monthLabel);
      values.push(Number(monthlyTotal.toFixed(2)));
    }

    return {
      labels,
      values,
      currency: userCurrency
    };
  }

  /**
   * Standalone distribution endpoint — actual payment-based category distribution.
   * Uses the same data source as getExpenseTrend() for consistency.
   * Default period: 1y (12 months).
   */
  async getCategoryDistribution(userId: string, period: '6m' | '1y' | 'all' = '1y'): Promise<CategoryDistributionData> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    const userCurrency = user.currency || 'CNY';

    const monthsBack = period === '6m' ? 6 : (period === '1y' ? 12 : 24);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);

    const [categories, records] = await Promise.all([
      this.categoryRepository.findAllByUserId(userId),
      this.paymentRecordRepository.findByUserIdAndDateRange(userId, startDate, now)
    ]);

    const categoryColorMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryColorMap.set(cat.name.toLowerCase(), cat.color || '#9CA3AF');
    });

    let totalAmount = 0;
    const categoryMap = new Map<string, { value: number; count: number }>();

    for (const record of records) {
      const sub = (record as any).subscription;
      // sub.category is the Prisma relation (Category object), sub.categoryName is the string
      const cat = sub?.category?.name || sub?.categoryName || 'Other';
      let amount = Number(record.amount);
      if (record.currency !== userCurrency) {
        amount = await this.currencyService.convert(amount, record.currency, userCurrency);
      }
      totalAmount += amount;
      const existing = categoryMap.get(cat) || { value: 0, count: 0 };
      categoryMap.set(cat, {
        value: existing.value + amount,
        count: existing.count + 1
      });
    }

    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      id: name,
      name,
      value: Number(data.value.toFixed(2)),
      count: data.count,
      percentage: totalAmount > 0 ? parseFloat(((data.value / totalAmount) * 100).toFixed(1)) : 0,
      color: categoryColorMap.get(name.toLowerCase()) || '#9CA3AF'
    })).sort((a, b) => b.value - a.value);
  }
}
