import { SubscriptionRepository } from "../repositories/SubscriptionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { CurrencyService } from "../services/CurrencyService";
import { DashboardStatsResponse, Money, SubscriptionDTO, ExpenseTrendData, CategoryDistributionData } from "@subcare/types";
import { Subscription, User } from "@subcare/database";

export class DashboardService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private userRepository: UserRepository,
    private currencyService: CurrencyService
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
    const activeSubs = await this.subscriptionRepository.findActiveByUserId(userId);
    
    // 1. Calculate Total Expenses (Monthly Equivalent)
    let totalMonthlyAmount = 0;
    
    // For trend calculation
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let newSubsAmountThisMonth = 0;

    // Process subscriptions in parallel for currency conversion
    const subsWithConvertedPrice = await Promise.all(activeSubs.map(async (sub) => {
      const originalPrice = Number(sub.price);
      // Convert to user's currency
      const convertedPrice = await this.currencyService.convert(originalPrice, sub.currency, userCurrency);
      const monthlyPrice = this.calculateMonthlyEquivalent(convertedPrice, sub.billingCycle);
      
      return {
        ...sub,
        monthlyPrice,
        startDate: new Date(sub.startDate)
      };
    }));

    subsWithConvertedPrice.forEach(sub => {
      totalMonthlyAmount += sub.monthlyPrice;
      if (sub.createdAt >= startOfCurrentMonth) {
        newSubsAmountThisMonth += sub.monthlyPrice;
      }
    });

    // Generate real history data (last 12 months)
    const historyData: number[] = [];
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthlyTotal = subsWithConvertedPrice.reduce((sum, sub) => {
            if (sub.startDate > endOfMonth) return sum;
            return sum + sub.monthlyPrice;
        }, 0);
        historyData.push(Number(monthlyTotal.toFixed(2)));
    }

    const previousMonthAmount = totalMonthlyAmount - newSubsAmountThisMonth;
    const trendDiff = totalMonthlyAmount - previousMonthAmount;
    const trendPercentage = previousMonthAmount > 0 
      ? (trendDiff / previousMonthAmount) * 100 
      : (totalMonthlyAmount > 0 ? 100 : 0);

    // 2. Active Subscriptions
    const activeCount = activeSubs.length;
    const newCount = activeSubs.filter(s => s.createdAt >= startOfCurrentMonth).length;
    
    // Category Distribution (Count based for summary)
    const categoryMap = new Map<string, number>();
    activeSubs.forEach(sub => {
      const cat = sub.category || 'Other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    
    const categoryCount = categoryMap.size;

    const categories = Array.from(categoryMap.entries()).map(([name, count], index) => ({
      id: name,
      name: name,
      percentage: Math.round((count / activeCount) * 100),
      color: this.getCategoryColor(index)
    })).sort((a, b) => b.percentage - a.percentage);

    // 3. Remaining Budget
    const budgetLimit = Number(user.monthlyBudget) || 0; // Default 0 if not set
    const remaining = Math.max(0, budgetLimit - totalMonthlyAmount);
    const usedPercentage = budgetLimit > 0 ? Math.round((totalMonthlyAmount / budgetLimit) * 100) : 100;
    
    // 4. Upcoming Renewals
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
            cycle: '/' + (nextRenewalSub.billingCycle === 'monthly' ? 'Month' : 'Year'), // Simplify
            daysRemaining: diffDays
        };
    }

    return {
      expenses: {
        total: {
          amount: totalMonthlyAmount,
          currency: userCurrency,
          formatted: this.formatMoney(totalMonthlyAmount, userCurrency)
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
    startDate.setDate(1); // Start from first day of month

    const subscriptions = await this.subscriptionRepository.findActiveByUserId(userId);
    
    const labels: string[] = [];
    const values: number[] = [];
    
    // Pre-calculate monthly equivalent for all subscriptions in user currency
    const subsWithConvertedPrice = await Promise.all(subscriptions.map(async (sub) => {
      const price = Number(sub.price);
      const convertedPrice = await this.currencyService.convert(price, sub.currency, userCurrency);
      return {
        ...sub,
        monthlyPrice: this.calculateMonthlyEquivalent(convertedPrice, sub.billingCycle),
        startDate: new Date(sub.startDate)
      };
    }));

    for (let i = 0; i < monthsBack; i++) {
      const currentMonth = new Date(startDate);
      currentMonth.setMonth(startDate.getMonth() + i);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const monthLabel = `${currentMonth.getMonth() + 1}月`;
      
      // Calculate total for this month
      // Assuming 'startDate' determines when the subscription started.
      // If a subscription was created AFTER this month, it shouldn't be counted.
      const monthlyTotal = subsWithConvertedPrice.reduce((sum, sub) => {
        if (sub.startDate > endOfMonth) {
          return sum;
        }
        return sum + sub.monthlyPrice;
      }, 0);

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

    const activeSubs = await this.subscriptionRepository.findActiveByUserId(userId);
    let totalAmount = 0;
    
    const categoryMap = new Map<string, { value: number; count: number }>();
    
    await Promise.all(activeSubs.map(async (sub) => {
      const cat = sub.category || 'Other';
      const price = Number(sub.price);
      const convertedPrice = await this.currencyService.convert(price, sub.currency, userCurrency);
      const amount = this.calculateMonthlyEquivalent(convertedPrice, sub.billingCycle);
      
      // Atomic update not needed here as we are inside Promise.all but Map is not thread-safe in other langs, 
      // JS is single threaded event loop but map set race condition could happen if we yield?
      // Actually with await inside map, we should be careful. 
      // Better to calculate all values first then aggregate synchronously.
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
