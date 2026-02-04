import { CurrencyService } from '../../../services/CurrencyService';
import { WebSearchService } from '../../../services/WebSearchService';
import { SubscriptionRepository } from '../../../repositories/SubscriptionRepository';
import { PaymentRecordRepository } from '../../../repositories/PaymentRecordRepository';
import { ExchangeRateRepository } from '../../../repositories/ExchangeRateRepository';
import {
  ToolName,
  ConvertCurrencyParams,
  ConvertCurrencyResult,
  SearchWebParams,
  SearchWebResult,
  SearchWebError,
  GetSubscriptionHistoryParams,
  SubscriptionHistoryResult
} from './ToolDefinitions';

export interface ToolExecutorDeps {
  currencyService: CurrencyService;
  webSearchService: WebSearchService;
  subscriptionRepository: SubscriptionRepository;
  paymentRecordRepository: PaymentRecordRepository;
  exchangeRateRepository: ExchangeRateRepository;
}

export class ToolExecutor {
  constructor(private deps: ToolExecutorDeps) {}

  /**
   * 执行工具调用
   */
  async execute(
    toolName: string,
    params: Record<string, unknown>,
    context: { userId: string }
  ): Promise<unknown> {
    switch (toolName) {
      case ToolName.CONVERT_CURRENCY:
        return this.convertCurrency(params as unknown as ConvertCurrencyParams);
      
      case ToolName.SEARCH_WEB:
        return this.searchWeb(params as unknown as SearchWebParams);
      
      case ToolName.GET_SUBSCRIPTION_HISTORY:
        return this.getSubscriptionHistory(
          params as unknown as GetSubscriptionHistoryParams,
          context.userId
        );
      
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  /**
   * 汇率转换工具
   */
  private async convertCurrency(params: ConvertCurrencyParams): Promise<ConvertCurrencyResult> {
    const { amount, from_currency, to_currency } = params;

    const convertedAmount = await this.deps.currencyService.convert(
      amount,
      from_currency,
      to_currency
    );

    const exchangeRate = await this.deps.currencyService.getRate(from_currency, to_currency);
    
    // 获取汇率最后更新时间
    const lastUpdate = await this.deps.exchangeRateRepository.getLastUpdateTime();

    return {
      original_amount: amount,
      original_currency: from_currency.toUpperCase(),
      converted_amount: convertedAmount,
      target_currency: to_currency.toUpperCase(),
      exchange_rate: exchangeRate,
      rate_updated_at: lastUpdate?.toISOString() || null
    };
  }

  /**
   * Web搜索工具
   */
  private async searchWeb(params: SearchWebParams): Promise<SearchWebResult | SearchWebError> {
    return this.deps.webSearchService.search(params);
  }

  /**
   * 订阅历史查询工具
   */
  private async getSubscriptionHistory(
    params: GetSubscriptionHistoryParams,
    userId: string
  ): Promise<SubscriptionHistoryResult> {
    const { subscription_name, months = 6 } = params;

    // 1. 模糊匹配用户的订阅
    const { items: subscriptions } = await this.deps.subscriptionRepository.findByUserId(userId);
    const matchedSub = subscriptions.find((sub: any) => 
      sub.name.toLowerCase().includes(subscription_name.toLowerCase()) ||
      subscription_name.toLowerCase().includes(sub.name.toLowerCase())
    );

    if (!matchedSub) {
      return {
        subscription: null,
        price_history: [],
        payment_records: [],
        analysis: {
          has_price_increase: false,
          total_price_change_percentage: 0,
          average_monthly_cost: 0,
          total_spent: 0,
          payment_count: 0
        },
        error: `Subscription "${subscription_name}" not found for this user`
      };
    }

    // 2. 计算日期范围
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Math.min(months, 24));

    // 3. 查询付款记录
    const { items: paymentRecords, totalAmount } = await this.deps.paymentRecordRepository.findBySubscriptionId(
      matchedSub.id,
      {
        startDate,
        endDate,
        limit: 100 // 获取足够的记录用于分析
      }
    );

    // 4. 分析价格变化
    const priceHistory = this.analyzePriceHistory(paymentRecords);
    
    // 5. 计算统计数据
    const analysis = this.calculateAnalysis(paymentRecords, priceHistory);

    return {
      subscription: {
        id: matchedSub.id,
        name: matchedSub.name,
        current_price: Number(matchedSub.price),
        currency: matchedSub.currency,
        billing_cycle: matchedSub.billingCycle,
        status: matchedSub.status
      },
      price_history: priceHistory,
      payment_records: paymentRecords.slice(0, 12).map(record => ({
        date: record.billingDate.toISOString().split('T')[0],
        amount: Number(record.amount),
        currency: record.currency,
        status: record.status
      })),
      analysis
    };
  }

  /**
   * 分析价格历史
   */
  private analyzePriceHistory(records: any[]): SubscriptionHistoryResult['price_history'] {
    if (records.length === 0) return [];

    // 按日期排序（从旧到新）
    const sortedRecords = [...records].sort(
      (a, b) => new Date(a.billingDate).getTime() - new Date(b.billingDate).getTime()
    );

    const priceHistory: SubscriptionHistoryResult['price_history'] = [];
    let lastPrice: number | null = null;

    for (const record of sortedRecords) {
      const price = Number(record.amount);
      let changePercentage: number | null = null;

      if (lastPrice !== null && lastPrice !== 0) {
        changePercentage = Number(((price - lastPrice) / lastPrice * 100).toFixed(2));
      }

      // 只在价格变化时或首次记录时添加到历史
      if (lastPrice === null || price !== lastPrice) {
        priceHistory.push({
          date: record.billingDate.toISOString().split('T')[0],
          price,
          currency: record.currency,
          change_percentage: changePercentage
        });
      }

      lastPrice = price;
    }

    return priceHistory;
  }

  /**
   * 计算分析数据
   */
  private calculateAnalysis(
    records: any[],
    priceHistory: SubscriptionHistoryResult['price_history']
  ): SubscriptionHistoryResult['analysis'] {
    if (records.length === 0) {
      return {
        has_price_increase: false,
        total_price_change_percentage: 0,
        average_monthly_cost: 0,
        total_spent: 0,
        payment_count: 0
      };
    }

    // 计算总支出
    const totalSpent = records.reduce((sum, r) => sum + Number(r.amount), 0);
    
    // 计算平均月成本
    const averageMonthlyCost = Number((totalSpent / Math.max(records.length, 1)).toFixed(2));

    // 判断是否涨价
    let totalPriceChangePercentage = 0;
    let hasPriceIncrease = false;

    if (priceHistory.length >= 2) {
      const firstPrice = priceHistory[0].price;
      const lastPrice = priceHistory[priceHistory.length - 1].price;
      
      if (firstPrice !== 0) {
        totalPriceChangePercentage = Number(((lastPrice - firstPrice) / firstPrice * 100).toFixed(2));
        hasPriceIncrease = totalPriceChangePercentage > 0;
      }
    }

    return {
      has_price_increase: hasPriceIncrease,
      total_price_change_percentage: totalPriceChangePercentage,
      average_monthly_cost: averageMonthlyCost,
      total_spent: Number(totalSpent.toFixed(2)),
      payment_count: records.length
    };
  }
}
