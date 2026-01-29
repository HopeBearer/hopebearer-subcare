import { SubscriptionRepository } from "../repositories/SubscriptionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { CurrencyService } from "../services/CurrencyService";
import { PaymentRecordRepository } from "../repositories/PaymentRecordRepository";
import { CategoryRepository } from "../repositories/CategoryRepository";
import { DashboardStatsResponse, ExpenseTrendData, CategoryDistributionData } from "@subcare/types";
import { Subscription, User } from "@subcare/database";

export class DashboardService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private userRepository: UserRepository,
    private currencyService: CurrencyService,
    private paymentRecordRepository: PaymentRecordRepository = new PaymentRecordRepository(),
    private categoryRepository: CategoryRepository = new CategoryRepository()
  ) {}

  private calculateMonthlyEquivalent(price: number, cycle: string): number {
    switch (cycle.toLowerCase()) {
      case 'yearly':
      case 'year':
      case 'annual':
        return price / 12;
      case 'weekly':
      case 'week':
        return price * 4.33;
      case 'daily':
      case 'day':
        return price * 30;
      case 'monthly':
      case 'month':
      default:
        return price;
    }
  }

  private formatMoney(amount: number, currency: string = 'CNY'): string {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'code',
    }).format(amount);
  }

  async getStats(userId: string): Promise<DashboardStatsResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const userCurrency = user.currency || 'CNY';
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 1. Calculate Expenses using PaymentRecords
    const currentMonthRecords = await this.paymentRecordRepository.findByUserIdAndDateRange(
      userId, startOfCurrentMonth, now
    );
    const lastMonthRecords = await this.paymentRecordRepository.findByUserIdAndDateRange(
      userId, startOfLastMonth, endOfLastMonth
    );

    const sumRecords = async (records: any[]) => {
      let total = 0;
      for (const record of records) {
        let amount = Number(record.amount);
        if (record.currency !== userCurrency) {
            // Use historical rate if available (simulated here by just checking if we stored it, 
            // but for now let's just convert using current service if not same currency)
            // Real impl would check record.exchangeRate
             amount = await this.currencyService.convert(amount, record.currency, userCurrency);
        }
        total += amount;
      }
      return total;
    };

    const currentMonthTotal = await sumRecords(currentMonthRecords);
    const lastMonthTotal = await sumRecords(lastMonthRecords);

    // Trend calculation
    const trendDiff = currentMonthTotal - lastMonthTotal;
    const trendPercentage = lastMonthTotal > 0 
      ? (trendDiff / lastMonthTotal) * 100 
      : (currentMonthTotal > 0 ? 100 : 0);

    // 2. Active Subscriptions count (still from Subscription table)
    const activeSubs = await this.subscriptionRepository.findActiveByUserId(userId);
    const activeCount = activeSubs.length;
    const newCount = activeSubs.filter(s => s.createdAt >= startOfCurrentMonth).length;
    
    // 3. Category Distribution (Simple count for summary, detailed in separate method)
    const categoryMap = new Map<string, number>();
    activeSubs.forEach(sub => {
      // Use category relation name if available, else fallback to old string or 'Other'
      // Since we just refactored, `sub` might not have populated category relation unless repository updated.
      // We'll rely on old string `categoryName` (mapped to `category`) for now as fallback.
      const cat = (sub as any).categoryName || (sub as any).category || 'Other'; 
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    const categoryCount = categoryMap.size;
    const categories = Array.from(categoryMap.entries()).map(([name, count], index) => ({
      id: name,
      name: name,
      percentage: Math.round((count / activeCount) * 100),
      color: this.getCategoryColor(index)
    })).sort((a, b) => b.percentage - a.percentage);

    // 4. Budget
    const budgetLimit = Number(user.monthlyBudget) || 0;
    const remaining = Math.max(0, budgetLimit - currentMonthTotal);
    const usedPercentage = budgetLimit > 0 ? Math.round((currentMonthTotal / budgetLimit) * 100) : 0;
    
    // 5. History Data (Last 12 months)
    const historyData: number[] = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const records = await this.paymentRecordRepository.findByUserIdAndDateRange(userId, d, e);
        const total = await sumRecords(records);
        historyData.push(Number(total.toFixed(2)));
    }

    // 6. Renewals
    const upcomingDays = 7;
    const renewals = await this.subscriptionRepository.findUpcomingRenewals(userId, upcomingDays);
    const nextRenewalSub = renewals[0] || null;

    let nextRenewalData = null;
    if (nextRenewalSub && nextRenewalSub.nextPayment) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const paymentDate = new Date(nextRenewalSub.nextPayment);
        paymentDate.setHours(0,0,0,0);
        
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
        trend: {
          percentage: Number(trendPercentage.toFixed(1)),
          direction: trendDiff > 0 ? 'up' : (trendDiff < 0 ? 'down' : 'flat'),
          diffAmount: {
            amount: Math.abs(trendDiff),
            currency: userCurrency,
            formatted: this.formatMoney(Math.abs(trendDiff), userCurrency)
          }
        },
        history: historyData
      },
      subscriptions: {
        activeCount,
        newCount,
        categoryCount,
        categories
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
        daysThreshold: upcomingDays,
        nextRenewal: nextRenewalData
      }
    };
  }

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

  async getCategoryDistribution(userId: string): Promise<CategoryDistributionData> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    const userCurrency = user.currency || 'CNY';

    // Get active subscriptions to group current expected costs, 
    // OR should we show actual spent in last month?
    // User requirement: "Category Distribution"
    // Usually means "Where is my money going currently?" -> Active Subscriptions
    // But since we have PaymentRecords, we could show "Last Month's Distribution" which is more accurate.
    // However, for "Planning", active subscriptions are better. 
    // Let's stick to Active Subscriptions for "Distribution" visualization but using the new logic if possible.
    // Actually, sticking to the existing logic for Category Distribution (based on active subs) is safer for "Current Portfolio" view,
    // while Expense Trend handles the "History".
    
    const activeSubs = await this.subscriptionRepository.findActiveByUserId(userId);
    let totalAmount = 0;
    const categoryMap = new Map<string, { value: number; count: number }>();
    
    // We still calculate "Monthly Equivalent" for the distribution pie chart
    // based on CURRENT active subscriptions.
    await Promise.all(activeSubs.map(async (sub) => {
      const cat = (sub as any).categoryName || (sub as any).category || 'Other';
      const price = Number(sub.price);
      const convertedPrice = await this.currencyService.convert(price, sub.currency, userCurrency);
      const amount = this.calculateMonthlyEquivalent(convertedPrice, sub.billingCycle);
      
      return { cat, amount };
    })).then(results => {
      results.forEach(({ cat, amount }) => {
        totalAmount += amount;
        const existing = categoryMap.get(cat) || { value: 0, count: 0 };
        categoryMap.set(cat, {
          value: existing.value + amount,
          count: existing.count + 1
        });
      });
    });

    return Array.from(categoryMap.entries()).map(([name, data], index) => ({
      id: name,
      name,
      value: Number(data.value.toFixed(2)),
      count: data.count,
      percentage: totalAmount > 0 ? parseFloat(((data.value / totalAmount) * 100).toFixed(1)) : 0,
      color: this.getCategoryColor(index)
    })).sort((a, b) => b.value - a.value);
  }

  private getCategoryColor(index: number): string {
    const colors = ['#A5A6F6', '#C4B5FD', '#DDD6FE', '#F3E8FF', '#E9D5FF'];
    return colors[index % colors.length];
  }
}
