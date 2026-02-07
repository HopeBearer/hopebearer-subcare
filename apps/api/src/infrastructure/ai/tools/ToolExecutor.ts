import { CurrencyService } from '../../../services/CurrencyService';
import { WebSearchService } from '../../../services/WebSearchService';
import { SubscriptionService } from '../../../services/SubscriptionService';
import { DashboardService } from '../../../services/DashboardService';
import { FinancialService } from '../../../services/FinancialService';
import { CategoryService } from '../../../services/CategoryService';
import { SubscriptionRepository } from '../../../repositories/SubscriptionRepository';
import { PaymentRecordRepository } from '../../../repositories/PaymentRecordRepository';
import { ExchangeRateRepository } from '../../../repositories/ExchangeRateRepository';
import { TemplateRepository } from '../../../repositories/TemplateRepository';
import { UserRepository } from '../../../repositories/UserRepository';
import { CategoryRepository } from '../../../repositories/CategoryRepository';
import { getVectorService } from '../../vector';
import { format } from 'date-fns';
import { NotificationService } from '../../../modules/notification/notification.service';
import { calculateMonthlyEquivalent } from '../../../utils/billing-utils';
import {
  ToolName,
  ConvertCurrencyParams,
  ConvertCurrencyResult,
  SearchWebParams,
  SearchWebResult,
  SearchWebError,
  GetSubscriptionHistoryParams,
  SubscriptionHistoryResult,
  LookupSubscriptionServiceParams,
  LookupSubscriptionServiceResult,
  QuickAddSubscriptionParams,
  QuickAddSubscriptionResult,
  SearchMySubscriptionsParams,
  SearchMySubscriptionsResult,
  CancelSubscriptionParams,
  CancelSubscriptionResult,
  GetSpendingSummaryParams,
  GetSpendingSummaryResult,
  // 新增类型
  UpdateSubscriptionParams,
  UpdateSubscriptionResult,
  GetUpcomingRenewalsParams,
  GetUpcomingRenewalsResult,
  PauseSubscriptionParams,
  PauseSubscriptionResult,
  ResumeSubscriptionParams,
  ResumeSubscriptionResult,
  ListCategoriesParams,
  ListCategoriesResult,
  // 账单相关类型
  ConfirmBillPaymentParams,
  ConfirmBillPaymentResult,
  CancelBillPaymentParams,
  CancelBillPaymentResult,
  CancelAllPendingBillsParams,
  CancelAllPendingBillsResult,
  GetPendingBillsParams,
  GetPendingBillsResult,
  UpdateBillParams,
  UpdateBillResult
} from './ToolDefinitions';

export interface ToolExecutorDeps {
  // ========== 核心服务（优先复用） ==========
  currencyService: CurrencyService;
  webSearchService: WebSearchService;
  subscriptionService: SubscriptionService;
  dashboardService: DashboardService;
  financialService: FinancialService;
  categoryService: CategoryService;
  
  // ========== 仓库（仅当服务不提供所需方法时使用） ==========
  subscriptionRepository: SubscriptionRepository;
  paymentRecordRepository: PaymentRecordRepository;
  exchangeRateRepository: ExchangeRateRepository;
  templateRepository: TemplateRepository;
  userRepository: UserRepository;
  categoryRepository: CategoryRepository;
  notificationService?: NotificationService;
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
      
      // 新增工具
      case ToolName.LOOKUP_SUBSCRIPTION_SERVICE:
        return this.lookupSubscriptionService(
          params as unknown as LookupSubscriptionServiceParams
        );
      
      case ToolName.QUICK_ADD_SUBSCRIPTION:
        return this.quickAddSubscription(
          params as unknown as QuickAddSubscriptionParams,
          context.userId
        );
      
      case ToolName.SEARCH_MY_SUBSCRIPTIONS:
        return this.searchMySubscriptions(
          params as unknown as SearchMySubscriptionsParams,
          context.userId
        );
      
      case ToolName.CANCEL_SUBSCRIPTION:
        return this.cancelSubscription(
          params as unknown as CancelSubscriptionParams,
          context.userId
        );
      
      case ToolName.GET_SPENDING_SUMMARY:
        return this.getSpendingSummary(
          params as unknown as GetSpendingSummaryParams,
          context.userId
        );
      
      // 新增工具
      case ToolName.UPDATE_SUBSCRIPTION:
        return this.updateSubscription(
          params as unknown as UpdateSubscriptionParams,
          context.userId
        );
      
      case ToolName.GET_UPCOMING_RENEWALS:
        return this.getUpcomingRenewals(
          params as unknown as GetUpcomingRenewalsParams,
          context.userId
        );
      
      case ToolName.PAUSE_SUBSCRIPTION:
        return this.pauseSubscription(
          params as unknown as PauseSubscriptionParams,
          context.userId
        );
      
      case ToolName.RESUME_SUBSCRIPTION:
        return this.resumeSubscription(
          params as unknown as ResumeSubscriptionParams,
          context.userId
        );
      
      case ToolName.LIST_CATEGORIES:
        return this.listCategories(
          params as unknown as ListCategoriesParams,
          context.userId
        );
      
      // 账单相关工具
      case ToolName.CONFIRM_BILL_PAYMENT:
        return this.confirmBillPayment(
          params as unknown as ConfirmBillPaymentParams,
          context.userId
        );

      case ToolName.CANCEL_BILL_PAYMENT:
        return this.cancelBillPayment(
          params as unknown as CancelBillPaymentParams,
          context.userId
        );

      case ToolName.CANCEL_ALL_PENDING_BILLS:
        return this.cancelAllPendingBills(
          params as unknown as CancelAllPendingBillsParams,
          context.userId
        );
      
      case ToolName.GET_PENDING_BILLS:
        return this.getPendingBills(
          params as unknown as GetPendingBillsParams,
          context.userId
        );
      
      case ToolName.UPDATE_BILL:
        return this.updateBill(
          params as unknown as UpdateBillParams,
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
    const { items: paymentRecords } = await this.deps.paymentRecordRepository.findBySubscriptionId(
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
        date: this.formatDate(record.billingDate),
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
          date: this.formatDate(record.billingDate),
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

  // =====================================================
  // 新增工具实现
  // =====================================================

  /**
   * 查询订阅服务模板（语义搜索）
   */
  private async lookupSubscriptionService(
    params: LookupSubscriptionServiceParams
  ): Promise<LookupSubscriptionServiceResult> {
    const { query } = params;
    const normalizedQuery = query.toLowerCase().trim();
    
    try {
      // 使用向量搜索服务
      const vectorService = getVectorService();
      const searchResults = await vectorService.search(query, 5);

      if (searchResults.length === 0) {
        return {
          found: false,
          matches: [],
          message: `系统模板库中没有 "${query}" 的信息。`
        };
      }

      // 获取完整的模板信息并进行精确度过滤
      const matchesWithDetails = await Promise.all(
        searchResults.map(async (result) => {
          const template = await this.deps.templateRepository.findById(result.templateId);
          return {
            templateId: result.templateId,
            name: result.name,
            displayName: result.displayName,
            category: result.category,
            icon: result.icon,
            website: template?.website || undefined,
            pricingPlans: template?.pricingPlans as Record<string, Record<string, number>> | undefined,
            defaultCurrency: template?.defaultCurrency,
            defaultCycle: template?.defaultCycle,
            score: result.score,
            // 检查是否是精确匹配
            isExactMatch: this.isExactNameMatch(normalizedQuery, result.name, result.displayName)
          };
        })
      );

      // 只返回精确匹配或高置信度（score > 0.85）的结果
      const exactMatches = matchesWithDetails.filter(m => m.isExactMatch);
      const highConfidenceMatches = matchesWithDetails.filter(m => m.score > 0.85);
      
      // 优先使用精确匹配，否则使用高置信度匹配
      const relevantMatches = exactMatches.length > 0 ? exactMatches : highConfidenceMatches;
      
      // 如果没有精确匹配也没有高置信度匹配，返回 not found
      if (relevantMatches.length === 0) {
        console.log(`[ToolExecutor] No exact match for "${query}", best score was ${matchesWithDetails[0]?.score}`);
        return {
          found: false,
          matches: [],
          message: `系统模板库中没有 "${query}" 的精确匹配。工具 quick_add_subscription 将自动进行网络搜索获取价格。`
        };
      }

      // 清理返回数据，移除内部字段
      const matches = relevantMatches.map(({ isExactMatch: _isExactMatch, ...rest }) => rest);

      // 获取最佳匹配的建议信息
      const best = matches[0];
      let suggestedPrice: number | undefined;
      let suggestedCurrency = best.defaultCurrency || 'CNY';

      if (best.pricingPlans) {
        // 优先使用 CN 价格
        const cnPricing = best.pricingPlans['CN'];
        const usPricing = best.pricingPlans['US'];
        
        if (cnPricing) {
          const firstPlan = Object.values(cnPricing)[0];
          if (typeof firstPlan === 'number') {
            suggestedPrice = firstPlan;
            suggestedCurrency = 'CNY';
          }
        } else if (usPricing) {
          const firstPlan = Object.values(usPricing)[0];
          if (typeof firstPlan === 'number') {
            suggestedPrice = firstPlan;
            suggestedCurrency = 'USD';
          }
        }
      }

      return {
        found: true,
        matches,
        bestMatch: {
          name: best.name,
          displayName: best.displayName,
          icon: best.icon,
          website: best.website,
          suggestedPrice,
          suggestedCurrency,
          suggestedCycle: best.defaultCycle || 'monthly'
        }
      };
    } catch (error: any) {
      console.error('[ToolExecutor] lookupSubscriptionService error:', error);
      return {
        found: false,
        matches: []
      };
    }
  }

  /**
   * 检查是否是精确的名称匹配
   */
  private isExactNameMatch(query: string, name: string, displayName?: string): boolean {
    const q = query.toLowerCase().replace(/[会员订阅服务]/g, '').trim();
    const n = name.toLowerCase().replace(/[会员订阅服务]/g, '').trim();
    const d = (displayName || '').toLowerCase().replace(/[会员订阅服务]/g, '').trim();
    
    // 完全匹配
    if (q === n || q === d) return true;
    
    // 包含匹配（双向）
    if (n.includes(q) || q.includes(n)) return true;
    if (d && (d.includes(q) || q.includes(d))) return true;
    
    // 关键词匹配（对于中文服务名）
    const queryWords = q.split(/[\s-]+/).filter(w => w.length > 1);
    const nameWords = n.split(/[\s-]+/).filter(w => w.length > 1);
    
    if (queryWords.length > 0 && nameWords.length > 0) {
      // 至少 50% 的查询词匹配名称词
      const matchedWords = queryWords.filter(qw => 
        nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
      );
      if (matchedWords.length >= queryWords.length * 0.5) return true;
    }
    
    return false;
  }

  /**
   * 快速添加订阅
   */
  private async quickAddSubscription(
    params: QuickAddSubscriptionParams,
    userId: string
  ): Promise<QuickAddSubscriptionResult> {
    try {
      const {
        name,
        price,
        currency,
        billingCycle = 'Monthly',
        categoryId,
        website,
        icon,
        startDate,
        allowDuplicate
      } = params;

      // 获取用户信息（用于默认货币）
      const user = await this.deps.userRepository.findById(userId);
      const userCurrency = user?.currency || 'CNY';

      // ============ 重复检测：只警告，不阻断 ============
      // 用户说"添加"就是想添加，直接执行，不要反复询问确认
      const { items: existingSubscriptions } = await this.deps.subscriptionRepository.findByUserId(userId);
      const normalizedName = name.toLowerCase().trim();
      
      // 查找所有同名订阅（包括别名匹配）
      const duplicates = existingSubscriptions.filter((sub: any) => 
        sub.normalizedName === normalizedName ||
        sub.name.toLowerCase() === normalizedName ||
        sub.name.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(sub.name.toLowerCase())
      );

      // 检测到重复时记录日志并生成警告
      let duplicateWarning: string | undefined;
      if (duplicates.length > 0) {
        console.log(`[ToolExecutor] Duplicate detected for "${name}" (${duplicates.length} existing)`);
        duplicateWarning = duplicates.length === 1
          ? `注意：您已有名为 "${duplicates[0].name}" 的订阅 (${duplicates[0].currency} ${Number(duplicates[0].price)}/${duplicates[0].billingCycle})。如需管理已有订阅，可使用 update_subscription 或 cancel_subscription。`
          : `注意：您已有 ${duplicates.length} 个相似的 "${name}" 订阅。如需管理已有订阅，可使用 update_subscription 或 cancel_subscription。`;
      }

      const duplicateSubscriptions = duplicates.map((sub: any) => ({
        displayId: sub.id,
        name: sub.name,
        price: Number(sub.price),
        currency: sub.currency,
        billingCycle: sub.billingCycle,
        status: sub.status,
        startDate: this.formatDate(sub.startDate),
        nextPayment: this.formatDate(sub.nextPayment)
      }));

      if (duplicates.length > 0 && !allowDuplicate) {
        return {
          success: false,
          error: '检测到重复订阅，请确认是否需要重新创建或改为更新/删除已有订阅。',
          existingSubscriptions: duplicateSubscriptions,
          duplicateCount: duplicates.length,
          duplicateWarning,
          requiresDuplicateConfirmation: true
        };
      }

      // ============ 从模板获取信息或使用用户提供的价格 ============
      let finalPrice: number | undefined = price; // 直接使用用户/AI 传入的价格
      let finalCurrency = currency || userCurrency;
      let finalIcon = icon;
      let finalWebsite = website;
      let finalCategoryName = 'Other';
      let finalCategoryId: string | undefined = categoryId;
      let infoSource: 'template' | 'web_search' | 'user_provided' = price !== undefined ? 'user_provided' : 'template';

      // 查找模板
      const template = await this.deps.templateRepository.findByName(name);
      
      if (template) {
        console.log(`[ToolExecutor] Found template for "${name}"`);
        infoSource = 'template';
        
        // 获取分类
        if (template.category) {
          finalCategoryName = template.category;
        }
        
        // 从模板获取价格（如果用户没有提供）
        if (finalPrice === undefined && template.pricingPlans) {
          const pricing = template.pricingPlans as Record<string, Record<string, number>>;
          const cnPricing = pricing['CN'];
          const usPricing = pricing['US'];
          
          if (cnPricing && finalCurrency === 'CNY') {
            finalPrice = Object.values(cnPricing)[0];
          } else if (usPricing && finalCurrency === 'USD') {
            finalPrice = Object.values(usPricing)[0];
          } else if (cnPricing) {
            finalPrice = Object.values(cnPricing)[0];
            finalCurrency = 'CNY';
          } else if (usPricing) {
            finalPrice = Object.values(usPricing)[0];
            finalCurrency = 'USD';
          }
        }
        
        finalIcon = finalIcon || template.icon || undefined;
        finalWebsite = finalWebsite || template.website || undefined;
      } else {
        console.log(`[ToolExecutor] No template for "${name}"`);
        // 没有模板，标记信息来源
        if (finalPrice !== undefined) {
          infoSource = 'user_provided'; // 价格来自用户或 search_web 结果
        }
        
        // 智能分类选择（根据服务名称关键词）
        finalCategoryName = this.inferCategoryFromName(name);
        console.log(`[ToolExecutor] Inferred category: ${finalCategoryName}`);
      }

      // ============ 如果没有价格，返回错误提示 AI 先调用 search_web ============
      if (finalPrice === undefined) {
        return {
          success: false,
          error: `缺少价格信息。请先调用 search_web 工具搜索 "${name}" 的价格，然后将搜索到的价格传入 price 参数。`,
          requiresSearchWeb: true,
          suggestedSearchQuery: `${name} 会员 订阅 价格 官方`
        };
      }

      // 查找或验证分类
      const availableCategories = await this.deps.categoryRepository.findAllByUserId(userId);
      const matchedCategory = availableCategories.find(
        c => c.name.toLowerCase() === finalCategoryName.toLowerCase()
      );
      
      if (matchedCategory) {
        finalCategoryId = matchedCategory.id;
        finalCategoryName = matchedCategory.name; // 使用标准名称
      } else {
        // 如果模板的分类不存在，使用 Other
        const otherCategory = availableCategories.find(c => c.name === 'Other');
        if (otherCategory) {
          finalCategoryId = otherCategory.id;
          finalCategoryName = 'Other';
        }
      }

      // 计算开始日期
      const start = startDate ? new Date(startDate) : new Date();

      // ============ 使用 SubscriptionService 创建订阅（包含历史账单回填逻辑）============
      if (this.deps.subscriptionService) {
        // 优先使用 SubscriptionService，它会处理历史账单回填和当日账单生成
        const subscription = await this.deps.subscriptionService.createSubscription({
          userId,
          name,
          price: finalPrice,
          currency: finalCurrency,
          billingCycle,
          startDate: start,
          category: finalCategoryName,
          icon: finalIcon,
          website: finalWebsite
        });

        // 检查是否有待支付账单（当日账单或历史回填后的当期账单）
        let pendingBillInfo: { id: string; amount: number; currency: string; billingDate: string } | undefined;
        let hasPendingBill = false;
        
        try {
          // 获取该订阅的所有账单
          const allBills = await this.deps.paymentRecordRepository.findBySubscriptionId(
            subscription.id
          );
          // 过滤出 PENDING 状态的账单
          const pendingBills = allBills.items.filter((b: any) => b.status === 'PENDING');
          
          if (pendingBills.length > 0) {
            hasPendingBill = true;
            const bill = pendingBills[0];
            pendingBillInfo = {
              id: bill.id,
              amount: Number(bill.amount),
              currency: bill.currency,
              billingDate: this.formatDate(bill.billingDate)
            };
          }
        } catch (e) {
          console.error('[ToolExecutor] Failed to check pending bills:', e);
        }

        // 构建后续提示
        // 重要：告诉 AI 需要先问用户是否需要修改，然后问是否已支付
        let followUpQuestion: string | undefined;
        if (hasPendingBill && pendingBillInfo) {
          followUpQuestion = `订阅创建成功。
1. 先询问用户价格和日期是否准确，如果需要修改可以使用 update_subscription 工具。
2. 然后询问账单 (${pendingBillInfo.currency} ${pendingBillInfo.amount}，${pendingBillInfo.billingDate}) 是否已支付。
3. 如果用户确认已支付，调用 confirm_bill_payment 工具。`;
        }

        return {
          success: true,
          subscription: {
            id: subscription.id,
            name: subscription.name,
            price: Number(subscription.price),
            currency: subscription.currency,
            billingCycle: subscription.billingCycle,
            startDate: this.formatDate(subscription.startDate),
            nextPayment: this.formatDate(subscription.nextPayment),
            icon: subscription.icon || undefined,
            website: subscription.website || undefined,
            category: finalCategoryName
          },
          hasPendingBill,
          pendingBill: pendingBillInfo,
          followUpQuestion,
          infoSource,
          existingSubscriptions: duplicateSubscriptions,
          duplicateCount: duplicates.length || undefined,
          // 重复警告（不阻断，只提醒）
          duplicateWarning,
          // 额外提示 AI 如何响应
          responseGuidelines: {
            showPriceSource: true,
            // 用户提供的价格（通过 search_web 或直接输入）可能需要确认
            offerToEditPrice: infoSource === 'user_provided',
            askAboutPayment: hasPendingBill
          }
        };
      }

      // ============ 降级：直接使用 Repository（不推荐，缺少账单逻辑）============
      console.warn('[ToolExecutor] SubscriptionService not injected, falling back to repository (no bill backfill)');
      
      const nextPayment = this.calculateNextPayment(start, billingCycle);
      const subscription = await this.deps.subscriptionRepository.create({
        user: { connect: { id: userId } },
        name,
        normalizedName: name.toLowerCase().trim(),
        price: finalPrice,
        currency: finalCurrency,
        billingCycle,
        startDate: start,
        nextPayment,
        status: 'ACTIVE',
        icon: finalIcon,
        website: finalWebsite,
        categoryName: finalCategoryName,
        ...(finalCategoryId && { category: { connect: { id: finalCategoryId } } })
      });

      // 发送通知（仅在降级模式下手动发送）
      if (this.deps.notificationService) {
        try {
          await this.deps.notificationService.notify({
            userId,
            type: 'billing',
            eventKey: 'billing.subscription_added',
            key: 'notification.subscription_added',
            data: {
              name: subscription.name,
              price: `${subscription.currency} ${Number(subscription.price)}`,
              billingCycle: subscription.billingCycle
            },
            link: `/subscriptions`
          });
        } catch (notifyError) {
          console.error('[ToolExecutor] Failed to send notification:', notifyError);
        }
      }

      // 降级模式下不会自动生成账单，提示用户
      return {
        success: true,
        subscription: {
          id: subscription.id,
          name: subscription.name,
          price: Number(subscription.price),
          currency: subscription.currency,
          billingCycle: subscription.billingCycle,
          startDate: this.formatDate(subscription.startDate),
          nextPayment: this.formatDate(subscription.nextPayment),
          icon: subscription.icon || undefined,
          website: subscription.website || undefined,
          category: finalCategoryName
        },
        hasPendingBill: false,
        followUpQuestion: '订阅已成功添加！下次付款日期是 ' + this.formatDate(subscription.nextPayment) + '。',
        infoSource,
        existingSubscriptions: duplicateSubscriptions,
        duplicateCount: duplicates.length || undefined,
        // 重复警告（不阻断，只提醒）
        duplicateWarning
      };
    } catch (error: any) {
      console.error('[ToolExecutor] quickAddSubscription error:', error);
      return {
        success: false,
        error: error.message || '添加订阅失败'
      };
    }
  }

  /**
   * 计算下次付款日期
   */
  private calculateNextPayment(startDate: Date, billingCycle: string): Date {
    const next = new Date(startDate);
    // 支持大小写
    const cycle = billingCycle.toLowerCase();
    switch (cycle) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  private formatDate(value?: Date | string | null): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return format(date, 'yyyy-MM-dd');
  }

  /**
   * 搜索我的订阅 - 复用 SubscriptionService 和 DashboardService
   */
  private async searchMySubscriptions(
    params: SearchMySubscriptionsParams,
    userId: string
  ): Promise<SearchMySubscriptionsResult> {
    const { query, filters } = params;
    
    try {
      // 复用 SubscriptionService 获取用户订阅
      const { items } = await this.deps.subscriptionService.getUserSubscriptions(userId, filters);
      
      console.log('[ToolExecutor] searchMySubscriptions - query:', query);
      console.log('[ToolExecutor] searchMySubscriptions - total items from DB:', items.length);
      console.log('[ToolExecutor] searchMySubscriptions - items:', items.map((s: any) => s.name));
      
      // 应用过滤器
      let filtered = items;
      
      if (filters?.status) {
        filtered = filtered.filter((s: any) => s.status === filters.status);
      }
      
      if (filters?.minPrice !== undefined) {
        filtered = filtered.filter((s: any) => Number(s.price) >= filters.minPrice!);
      }
      
      if (filters?.maxPrice !== undefined) {
        filtered = filtered.filter((s: any) => Number(s.price) <= filters.maxPrice!);
      }
      
      if (filters?.category) {
        filtered = filtered.filter((s: any) => 
          s.category?.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }

      // 自然语言查询处理
      const queryLower = query.toLowerCase();
      
      // 检查是否查询所有订阅
      const isAllQuery = queryLower.includes('所有') || 
                         queryLower.includes('全部') || 
                         queryLower.includes('all') ||
                         queryLower === '订阅' ||
                         queryLower === '我的订阅' ||
                         queryLower.includes('list') ||
                         queryLower.includes('查看') ||
                         queryLower.includes('告诉') ||
                         queryLower.includes('列出') ||
                         queryLower.includes('显示') ||
                         queryLower.includes('哪些');
      
      console.log('[ToolExecutor] searchMySubscriptions - isAllQuery:', isAllQuery, 'queryLower:', queryLower);
      
      // 特殊查询处理
      if (isAllQuery) {
        // 不过滤，返回所有订阅
        // 如果同时指定了"活跃"，则过滤
        if (queryLower.includes('活跃') || queryLower.includes('active')) {
          filtered = filtered.filter((s: any) => s.status === 'ACTIVE');
        }
      } else if (queryLower.includes('最贵') || queryLower.includes('expensive')) {
        filtered = filtered.sort((a: any, b: any) => Number(b.price) - Number(a.price));
      } else if (queryLower.includes('最便宜') || queryLower.includes('cheap')) {
        filtered = filtered.sort((a: any, b: any) => Number(a.price) - Number(b.price));
      } else if (queryLower.includes('即将') || queryLower.includes('下个月') || queryLower.includes('upcoming')) {
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        filtered = filtered.filter((s: any) => {
          if (!s.nextPayment) return false;
          const payment = new Date(s.nextPayment);
          return payment >= now && payment <= nextMonth;
        }).sort((a: any, b: any) => 
          new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime()
        );
      } else if (queryLower.includes('活跃') || queryLower.includes('active')) {
        filtered = filtered.filter((s: any) => s.status === 'ACTIVE');
      } else if (queryLower.includes('流媒体') || queryLower.includes('streaming')) {
        filtered = filtered.filter((s: any) => 
          s.category?.toLowerCase().includes('streaming') ||
          ['netflix', 'spotify', 'youtube', 'disney', 'hbo', 'bilibili', '爱奇艺', '腾讯视频', '优酷']
            .some(name => s.name.toLowerCase().includes(name))
        );
      } else {
        // 通用模糊匹配
        filtered = filtered.filter((s: any) =>
          s.name.toLowerCase().includes(queryLower) ||
          queryLower.includes(s.name.toLowerCase()) ||
          s.category?.toLowerCase().includes(queryLower)
        );
      }

      // 直接复用 DashboardService 获取支出数据，保持数据一致
      const dashboardStats = await this.deps.dashboardService.getStats(userId);
      const totalMonthlySpend = dashboardStats.expenses.total.amount;
      const userCurrency = dashboardStats.expenses.total.currency;

      return {
        total: filtered.length,
        subscriptions: filtered.slice(0, 10).map((s: any, index: number) => ({
          // 使用 id 字段（类型要求），但实际上前端应该用 displayId
          id: s.id,
          // 使用序号+名称首字母作为用户友好的标识符
          displayId: `#${index + 1}`,
          // 保留完整ID供内部操作使用，但不在AI回复中展示
          _internalId: s.id,
          name: s.name,
          price: Number(s.price),
          currency: s.currency,
          billingCycle: s.billingCycle,
          status: s.status,
          startDate: this.formatDate(s.startDate),
          nextPayment: this.formatDate(s.nextPayment),
          category: s.category || 'Other',
          icon: s.icon
        })) as any,
        summary: {
          totalMonthlySpend: Number(totalMonthlySpend.toFixed(2)),
          currency: userCurrency
        }
      };
    } catch (error: any) {
      console.error('[ToolExecutor] searchMySubscriptions error:', error);
      return {
        total: 0,
        subscriptions: []
      };
    }
  }

  /**
   * 取消订阅
   */
  private async cancelSubscription(
    params: CancelSubscriptionParams,
    userId: string
  ): Promise<CancelSubscriptionResult> {
    const { nameOrId, hardDelete = false } = params;
    
    try {
      // 查找订阅（复用 SubscriptionService）
      const { items } = await this.deps.subscriptionService!.getUserSubscriptions(userId);
      
      // 按 ID 或名称匹配
      const subscription = items.find((s: any) => 
        s.id === nameOrId || 
        s.name.toLowerCase() === nameOrId.toLowerCase() ||
        s.name.toLowerCase().includes(nameOrId.toLowerCase())
      );

      if (!subscription) {
        return {
          success: false,
          action: 'cancelled',
          error: `找不到订阅: "${nameOrId}"`
        };
      }

      if (hardDelete) {
        // 复用 SubscriptionService.deleteSubscription
        await this.deps.subscriptionService!.deleteSubscription(subscription.id, userId);
        return {
          success: true,
          action: 'deleted',
          subscription: {
            id: subscription.id,
            name: subscription.name
          }
        };
      } else {
        // 软删除 - 复用 SubscriptionService.updateSubscription
        await this.deps.subscriptionService!.updateSubscription(subscription.id, userId, {
          status: 'CANCELLED'
        } as any);
        return {
          success: true,
          action: 'cancelled',
          subscription: {
            id: subscription.id,
            name: subscription.name
          }
        };
      }
    } catch (error: any) {
      console.error('[ToolExecutor] cancelSubscription error:', error);
      return {
        success: false,
        action: 'cancelled',
        error: error.message || '取消订阅失败'
      };
    }
  }

  /**
   * 获取支出摘要
   * 
   * 当 period === 'this_month' 时，所有数据统一基于本月 PaymentRecord（与仪表盘一致）：
   * - totalSpend = 本月实际支付总额
   * - byCategory = 本月实际支付分类分布
   * - topSubscriptions = 本月实际支付排行
   * - monthlyEquivalentTotal = 月度等价总额（仅作为参考附加字段）
   * 
   * 其他 period 使用月度等价计算。
   */
  private async getSpendingSummary(
    params: GetSpendingSummaryParams,
    userId: string
  ): Promise<GetSpendingSummaryResult> {
    const { period = 'this_month' } = params;
    
    try {
      // 复用 DashboardService 的逻辑，保持数据一致
      const dashboardStats = await this.deps.dashboardService.getStats(userId);
      
      // 计算期间标签
      const periodLabels: Record<string, string> = {
        'this_month': '本月',
        'last_month': '上月',
        'this_year': '今年',
        'all_time': '总计'
      };

      const userCurrency = dashboardStats.expenses.total.currency;

      if (period === 'this_month') {
        // === 本月：全部基于当月实际 PaymentRecord，与仪表盘完全一致 ===
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // 获取本月所有支付记录（含已删除订阅的）
        const currentMonthRecords = await this.deps.paymentRecordRepository.findByUserIdAndDateRange(
          userId, startOfMonth, endOfMonth
        );

        // 分类颜色映射
        const categories = await this.deps.categoryRepository.findAllByUserId(userId);
        const categoryColorMap = new Map<string, string>();
        categories.forEach(cat => {
          categoryColorMap.set(cat.name.toLowerCase(), cat.color || '#9CA3AF');
        });

        // 按分类统计（基于实际支付记录）
        let totalActual = 0;
        const categoryMap = new Map<string, { value: number; count: number }>();
        const subAmountMap = new Map<string, { name: string; amount: number }>();

        for (const record of currentMonthRecords) {
          const sub = (record as any).subscription;
          const cat = sub?.category?.name || sub?.categoryName || 'Other';
          const subName = sub?.name || 'Unknown';
          let amount = Number(record.amount);
          if (record.currency !== userCurrency) {
            amount = await this.deps.currencyService.convert(amount, record.currency, userCurrency);
          }
          totalActual += amount;

          // 分类汇总
          const existing = categoryMap.get(cat) || { value: 0, count: 0 };
          categoryMap.set(cat, {
            value: existing.value + amount,
            count: existing.count + 1
          });

          // 订阅排行
          const subExisting = subAmountMap.get(subName) || { name: subName, amount: 0 };
          subAmountMap.set(subName, {
            name: subName,
            amount: subExisting.amount + amount
          });
        }

        const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          amount: Number(data.value.toFixed(2)),
          count: data.count,
          percentage: totalActual > 0 ? Number((data.value / totalActual * 100).toFixed(1)) : 0
        })).sort((a, b) => b.amount - a.amount);

        const topSubscriptions = Array.from(subAmountMap.values())
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
          .map(sub => ({
            name: sub.name,
            amount: Number(sub.amount.toFixed(2)),
            percentage: totalActual > 0 ? Number((sub.amount / totalActual * 100).toFixed(1)) : 0
          }));

        // 月度等价总额作为参考（活跃订阅月费折算）
        const { items: activeSubs } = await this.deps.subscriptionRepository.findByUserId(userId, { status: 'ACTIVE' });
        let monthlyEquivalentTotal = 0;
        for (const sub of activeSubs) {
          const price = Number(sub.price);
          const fromCurrency = (sub as any).currency || userCurrency;
          const convertedPrice = fromCurrency === userCurrency
            ? price
            : await this.deps.currencyService.convert(price, fromCurrency, userCurrency);
          monthlyEquivalentTotal += calculateMonthlyEquivalent(convertedPrice, String((sub as any).billingCycle || 'monthly'));
        }

        return {
          period,
          periodLabel: periodLabels[period] || period,
          totalSpend: Number(totalActual.toFixed(2)),
          actualMonthlyPayment: Number(totalActual.toFixed(2)),
          monthlyEquivalentTotal: Number(monthlyEquivalentTotal.toFixed(2)),
          currency: userCurrency,
          subscriptionCount: dashboardStats.subscriptions.activeCount,
          byCategory,
          topSubscriptions
        };
      }

      // === 其他 period：使用月度等价计算 ===
      const categoryDistribution = await this.deps.dashboardService.getCategoryDistribution(userId);
      const byCategory = categoryDistribution.map(cat => ({
        category: cat.name,
        amount: cat.value,
        count: cat.count ?? 0,
        percentage: cat.percentage
      }));

      const totalSpend = Number(
        categoryDistribution.reduce((sum, cat) => sum + cat.value, 0).toFixed(2)
      );

      const { items: activeSubs } = await this.deps.subscriptionRepository.findByUserId(userId, { status: 'ACTIVE' });
      const topSubscriptionCandidates = await Promise.all(
        activeSubs.map(async (sub: any) => {
          const price = Number(sub.price);
          const fromCurrency = sub.currency || userCurrency;
          const convertedPrice = fromCurrency === userCurrency
            ? price
            : await this.deps.currencyService.convert(price, fromCurrency, userCurrency);
          const monthlyAmount = calculateMonthlyEquivalent(convertedPrice, String(sub.billingCycle || 'monthly'));
          return {
            name: sub.name,
            amount: Number(monthlyAmount.toFixed(2))
          };
        })
      );

      const topSubscriptions = topSubscriptionCandidates
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map(sub => ({
          name: sub.name,
          amount: sub.amount,
          percentage: totalSpend > 0 ? Number((sub.amount / totalSpend * 100).toFixed(1)) : 0
        }));

      return {
        period,
        periodLabel: periodLabels[period] || period,
        totalSpend,
        actualMonthlyPayment: dashboardStats.expenses.total.amount,
        currency: userCurrency,
        subscriptionCount: dashboardStats.subscriptions.activeCount,
        byCategory,
        topSubscriptions
      };
    } catch (error: any) {
      console.error('[ToolExecutor] getSpendingSummary error:', error);
      return {
        period,
        periodLabel: period,
        totalSpend: 0,
        actualMonthlyPayment: 0,
        currency: 'CNY',
        subscriptionCount: 0,
        byCategory: [],
        topSubscriptions: []
      };
    }
  }

  /**
   * 更新订阅 - 复用 SubscriptionService.updateSubscription
   */
  private async updateSubscription(
    params: UpdateSubscriptionParams,
    userId: string
  ): Promise<UpdateSubscriptionResult> {
    try {
      const { subscriptionId, ...updateData } = params;

      // 构建更新数据
      const data: any = {};
      if (updateData.name) data.name = updateData.name;
      if (updateData.price !== undefined) data.price = updateData.price;
      if (updateData.currency) data.currency = updateData.currency;
      if (updateData.billingCycle) data.billingCycle = updateData.billingCycle;
      if (updateData.status) data.status = updateData.status;
      
      // 分类更新：复用 CategoryService 验证分类
      if (updateData.category) {
        const availableCategories = await this.deps.categoryService.getCategories(userId);
        const matchedCategory = availableCategories.find(
          c => c.name.toLowerCase() === updateData.category!.toLowerCase()
        );
        
        if (!matchedCategory) {
          const availableNames = availableCategories.map(c => c.name).join(', ');
          return {
            success: false,
            error: `分类 "${updateData.category}" 不存在。可用分类：${availableNames}`
          };
        }
        
        data.category = matchedCategory.name;
      }
      
      if (updateData.enableNotification !== undefined) data.enableNotification = updateData.enableNotification;
      if (updateData.notifyDaysBefore !== undefined) data.notifyDaysBefore = updateData.notifyDaysBefore;
      if (updateData.notes !== undefined) data.notes = updateData.notes;

      // 复用 SubscriptionService.updateSubscription
      const updated = await this.deps.subscriptionService.updateSubscription(subscriptionId, userId, data);

      let pendingBill: UpdateSubscriptionResult['pendingBill'];
      if (updateData.price !== undefined) {
        const pendingBills = await this.deps.financialService.getPendingBills(userId);
        const bill = pendingBills.find((b: any) => b.subscriptionId === updated.id);
        if (bill && bill.status === 'PENDING') {
          const billUpdate = await this.updateBill(
            { billId: bill.id, amount: updateData.price },
            userId
          );
          if (billUpdate.success && billUpdate.bill) {
            pendingBill = {
              id: billUpdate.bill.id,
              amount: billUpdate.bill.amount,
              currency: billUpdate.bill.currency,
              billingDate: billUpdate.bill.billingDate,
              status: billUpdate.bill.status
            };
          }
        }
      }

      return {
        success: true,
        subscription: {
          id: updated.id,
          name: updated.name,
          price: Number(updated.price),
          currency: updated.currency,
          billingCycle: updated.billingCycle,
          status: updated.status,
          nextPayment: this.formatDate(updated.nextPayment)
        },
        pendingBill
      };
    } catch (error: any) {
      console.error('[ToolExecutor] updateSubscription error:', error);
      return {
        success: false,
        error: error.message || '更新订阅失败'
      };
    }
  }

  /**
   * 获取即将续费的订阅 - 复用 SubscriptionService.getUpcomingRenewals
   */
  private async getUpcomingRenewals(
    params: GetUpcomingRenewalsParams,
    userId: string
  ): Promise<GetUpcomingRenewalsResult> {
    try {
      const days = Math.min(params.days || 7, 30);
      
      // 复用 SubscriptionService 获取即将续费的订阅
      const subscriptions = await this.deps.subscriptionService.getUpcomingRenewals(userId, days);
      
      const now = new Date();
      const upcoming = subscriptions.map((sub: any) => {
        const nextPayment = new Date(sub.nextPayment);
        const daysUntilRenewal = Math.ceil((nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: sub.id,
          name: sub.name,
          price: Number(sub.price),
          currency: sub.currency,
          billingCycle: sub.billingCycle,
          nextPayment: this.formatDate(nextPayment),
          daysUntilRenewal,
          icon: sub.icon || undefined
        };
      }).sort((a: any, b: any) => a.daysUntilRenewal - b.daysUntilRenewal);

      return {
        total: upcoming.length,
        subscriptions: upcoming
      };
    } catch (error: any) {
      console.error('[ToolExecutor] getUpcomingRenewals error:', error);
      return {
        total: 0,
        subscriptions: []
      };
    }
  }

  /**
   * 暂停订阅 - 复用 SubscriptionService.updateSubscription
   */
  private async pauseSubscription(
    params: PauseSubscriptionParams,
    userId: string
  ): Promise<PauseSubscriptionResult> {
    try {
      const { nameOrId } = params;
      
      // 查找订阅
      const subscription = await this.findSubscriptionByNameOrId(nameOrId, userId);
      
      if (!subscription) {
        return {
          success: false,
          error: `未找到订阅: ${nameOrId}`
        };
      }

      if (subscription.status === 'PAUSED') {
        return {
          success: false,
          error: `订阅 "${subscription.name}" 已经是暂停状态`
        };
      }

      // 复用 SubscriptionService.updateSubscription
      const updated = await this.deps.subscriptionService.updateSubscription(subscription.id, userId, {
        status: 'PAUSED'
      } as any);

      return {
        success: true,
        subscription: {
          id: updated.id,
          name: updated.name,
          status: updated.status
        }
      };
    } catch (error: any) {
      console.error('[ToolExecutor] pauseSubscription error:', error);
      return {
        success: false,
        error: error.message || '暂停订阅失败'
      };
    }
  }

  /**
   * 恢复订阅 - 复用 SubscriptionService.updateSubscription
   */
  private async resumeSubscription(
    params: ResumeSubscriptionParams,
    userId: string
  ): Promise<ResumeSubscriptionResult> {
    try {
      const { nameOrId } = params;
      
      // 查找订阅
      const subscription = await this.findSubscriptionByNameOrId(nameOrId, userId);
      
      if (!subscription) {
        return {
          success: false,
          error: `未找到订阅: ${nameOrId}`
        };
      }

      if (subscription.status === 'ACTIVE') {
        return {
          success: false,
          error: `订阅 "${subscription.name}" 已经是活跃状态`
        };
      }

      // 复用 SubscriptionService.updateSubscription（它会处理 nextPayment 计算）
      const updated = await this.deps.subscriptionService.updateSubscription(subscription.id, userId, {
        status: 'ACTIVE'
      } as any);

      return {
        success: true,
        subscription: {
          id: updated.id,
          name: updated.name,
          status: updated.status,
          nextPayment: this.formatDate(updated.nextPayment)
        }
      };
    } catch (error: any) {
      console.error('[ToolExecutor] resumeSubscription error:', error);
      return {
        success: false,
        error: error.message || '恢复订阅失败'
      };
    }
  }

  /**
   * 查询系统分类列表 - 复用 CategoryService.getCategories
   */
  private async listCategories(
    params: ListCategoriesParams,
    userId: string
  ): Promise<ListCategoriesResult> {
    try {
      const { includeStats = false } = params;
      
      // 复用 CategoryService 获取分类
      const categories = await this.deps.categoryService.getCategories(userId);
      
      // 如果需要统计，复用 SubscriptionService 获取订阅
      let categoryStats: Map<string, number> | null = null;
      if (includeStats) {
        categoryStats = new Map();
        const { items } = await this.deps.subscriptionService.getUserSubscriptions(userId, { status: 'ACTIVE' });
        
        items.forEach((sub: any) => {
          const catName = sub.category || 'Other';
          categoryStats!.set(catName, (categoryStats!.get(catName) || 0) + 1);
        });
      }
      
      const result: ListCategoriesResult = {
        total: categories.length,
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          isSystem: cat.userId === null,
          ...(includeStats ? { 
            subscriptionCount: categoryStats?.get(cat.name) || 0 
          } : {})
        }))
      };
      
      return result;
    } catch (error: any) {
      console.error('[ToolExecutor] listCategories error:', error);
      return {
        total: 0,
        categories: []
      };
    }
  }

  /**
   * 通过名称或ID查找订阅
   */
  private async findSubscriptionByNameOrId(nameOrId: string, userId: string): Promise<any> {
    // 先尝试按 ID 查找
    const byId = await this.deps.subscriptionRepository.findById(nameOrId);
    if (byId && byId.userId === userId) {
      return byId;
    }

    // 按名称模糊匹配
    const { items } = await this.deps.subscriptionRepository.findByUserId(userId);
    return items.find((sub: any) => 
      sub.name.toLowerCase() === nameOrId.toLowerCase() ||
      sub.name.toLowerCase().includes(nameOrId.toLowerCase())
    );
  }

  // ============ 账单相关工具方法 ============

  /**
   * 确认账单支付 - 复用 FinancialService.confirmPayment
   */
  private async confirmBillPayment(
    params: ConfirmBillPaymentParams,
    userId: string
  ): Promise<ConfirmBillPaymentResult> {
    try {
      const { subscriptionNameOrId, actualAmount, actualDate } = params;

      // 查找订阅
      const subscription = await this.findSubscriptionByNameOrId(subscriptionNameOrId, userId);
      if (!subscription) {
        return {
          success: false,
          error: `找不到订阅: "${subscriptionNameOrId}"`
        };
      }

      // 复用 FinancialService 获取待支付账单
      const pendingBills = await this.deps.financialService.getPendingBills(userId);
      const bill = pendingBills.find((b: any) => b.subscriptionId === subscription.id);

      if (!bill) {
        return {
          success: false,
          error: `${subscription.name} 没有待支付的账单`
        };
      }

      // 复用 FinancialService.confirmPayment（包含完整的业务逻辑：更新状态、推进日期、预算检查、通知等）
      await this.deps.financialService.confirmPayment(
        userId,
        bill.id,
        actualAmount,
        actualDate ? new Date(actualDate) : undefined
      );

      // 获取更新后的订阅信息
      const updatedSub = await this.deps.subscriptionRepository.findById(subscription.id);

      return {
        success: true,
        bill: {
          id: bill.id,
          subscriptionName: subscription.name,
          amount: actualAmount ?? Number(bill.amount),
          currency: bill.currency,
          billingDate: this.formatDate(bill.billingDate),
          status: 'PAID'
        },
        subscription: {
          name: subscription.name,
          nextPayment: this.formatDate(updatedSub?.nextPayment)
        }
      };
    } catch (error: any) {
      console.error('[ToolExecutor] confirmBillPayment error:', error);
      return {
        success: false,
        error: error.message || '确认账单支付失败'
      };
    }
  }

  /**
   * 取消账单支付 - 取消续费并记录备注
   */
  private async cancelBillPayment(
    params: CancelBillPaymentParams,
    userId: string
  ): Promise<CancelBillPaymentResult> {
    try {
      const { billId, subscriptionNameOrId, note } = params;

      let bill = billId ? await this.deps.paymentRecordRepository.findById(billId) : null;

      if (!bill && subscriptionNameOrId) {
        const subscription = await this.findSubscriptionByNameOrId(subscriptionNameOrId, userId);
        if (!subscription) {
          return {
            success: false,
            error: `找不到订阅: "${subscriptionNameOrId}"`
          };
        }

        const pendingBills = await this.deps.financialService.getPendingBills(userId);
        bill = pendingBills.find((b: any) => b.subscriptionId === subscription.id) || null;
      }

      if (!bill) {
        return {
          success: false,
          error: '找不到账单'
        };
      }

      if (bill.userId !== userId) {
        return {
          success: false,
          error: '无权访问此账单'
        };
      }

      if (bill.status !== 'PENDING') {
        return {
          success: false,
          error: `只能取消待支付状态的账单，当前状态：${bill.status}`
        };
      }

      const updatedBill = await this.deps.financialService.cancelRenewal(userId, bill.id);
      if (note !== undefined) {
        await this.deps.paymentRecordRepository.update(updatedBill.id, {
          note,
          updatedAt: new Date()
        });
      }

      const subscription = await this.deps.subscriptionRepository.findById(bill.subscriptionId);

      return {
        success: true,
        bill: {
          id: updatedBill.id,
          subscriptionName: subscription?.name || 'Unknown',
          amount: Number(updatedBill.amount),
          currency: updatedBill.currency,
          billingDate: this.formatDate(updatedBill.billingDate),
          status: updatedBill.status,
          note: note ?? updatedBill.note ?? undefined
        }
      };
    } catch (error: any) {
      console.error('[ToolExecutor] cancelBillPayment error:', error);
      return {
        success: false,
        error: error.message || '取消账单失败'
      };
    }
  }

  /**
   * 取消所有待支付账单
   */
  private async cancelAllPendingBills(
    params: CancelAllPendingBillsParams,
    userId: string
  ): Promise<CancelAllPendingBillsResult> {
    try {
      const { note } = params;
      const pendingBills = await this.deps.financialService.getPendingBills(userId);

      if (!pendingBills || pendingBills.length === 0) {
        return {
          success: true,
          count: 0,
          bills: []
        };
      }

      const updatedBills = [];
      for (const bill of pendingBills) {
        const updated = await this.deps.financialService.cancelRenewal(userId, bill.id);
        if (note !== undefined) {
          await this.deps.paymentRecordRepository.update(updated.id, {
            note,
            updatedAt: new Date()
          });
        }
        const subscription = await this.deps.subscriptionRepository.findById(bill.subscriptionId);

        updatedBills.push({
          id: updated.id,
          subscriptionName: subscription?.name || 'Unknown',
          amount: Number(updated.amount),
          currency: updated.currency,
          billingDate: this.formatDate(updated.billingDate),
          status: updated.status,
          note: note ?? updated.note ?? undefined
        });
      }

      return {
        success: true,
        count: updatedBills.length,
        bills: updatedBills
      };
    } catch (error: any) {
      console.error('[ToolExecutor] cancelAllPendingBills error:', error);
      return {
        success: false,
        error: error.message || '取消待支付账单失败'
      };
    }
  }

  /**
   * 获取待支付账单列表
   */
  private async getPendingBills(
    params: GetPendingBillsParams,
    userId: string
  ): Promise<GetPendingBillsResult> {
    try {
      const { subscriptionName, limit = 10 } = params;

      // 复用 FinancialService 获取待支付账单
      const pendingBills = await this.deps.financialService.getPendingBills(userId);

      if (!pendingBills || pendingBills.length === 0) {
        return {
          total: 0,
          bills: []
        };
      }

      // 映射账单（FinancialService 返回的数据已包含订阅信息）
      let bills = pendingBills.map((bill: any) => ({
        id: bill.id,
        subscriptionId: bill.subscriptionId,
        subscriptionName: bill.subscription?.name || 'Unknown',
        amount: Number(bill.amount),
        currency: bill.currency,
        billingDate: this.formatDate(bill.billingDate),
        status: bill.status,
        note: bill.note || undefined,
        icon: bill.subscription?.icon || undefined
      }));

      // 如果指定了订阅名称，过滤
      if (subscriptionName) {
        const nameLower = subscriptionName.toLowerCase();
        bills = bills.filter((b: any) => 
          b.subscriptionName.toLowerCase().includes(nameLower)
        );
      }

      // 按日期排序
      bills.sort((a: any, b: any) => 
        new Date(a.billingDate).getTime() - new Date(b.billingDate).getTime()
      );

      return {
        total: bills.length,
        bills: bills.slice(0, limit)
      };
    } catch (error: any) {
      console.error('[ToolExecutor] getPendingBills error:', error);
      return {
        total: 0,
        bills: []
      };
    }
  }

  /**
   * 更新账单
   */
  private async updateBill(
    params: UpdateBillParams,
    userId: string
  ): Promise<UpdateBillResult> {
    try {
      const { billId, amount, billingDate, note } = params;

      // 查找账单
      const bill = await this.deps.paymentRecordRepository.findById(billId);
      if (!bill) {
        return {
          success: false,
          error: '找不到账单'
        };
      }

      // 验证权限
      if (bill.userId !== userId) {
        return {
          success: false,
          error: '无权访问此账单'
        };
      }

      // 只能更新 PENDING 状态的账单
      if (bill.status !== 'PENDING') {
        return {
          success: false,
          error: `只能更新待支付状态的账单，当前状态：${bill.status}`
        };
      }

      // 构建更新数据
      const updateData: any = {
        updatedAt: new Date()
      };
      if (amount !== undefined) updateData.amount = amount;
      if (billingDate) updateData.billingDate = new Date(billingDate);
      if (note !== undefined) updateData.note = note;

      const updatedBill = await this.deps.paymentRecordRepository.update(billId, updateData);

      // 获取订阅名称
      const subscription = await this.deps.subscriptionRepository.findById(bill.subscriptionId);

      return {
        success: true,
        bill: {
          id: updatedBill.id,
          subscriptionName: subscription?.name || 'Unknown',
          amount: Number(updatedBill.amount),
          currency: updatedBill.currency,
          billingDate: this.formatDate(updatedBill.billingDate),
          status: updatedBill.status,
          note: updatedBill.note || undefined
        }
      };
    } catch (error: any) {
      console.error('[ToolExecutor] updateBill error:', error);
      return {
        success: false,
        error: error.message || '更新账单失败'
      };
    }
  }

  /**
   * 根据服务名称智能推断分类
   */
  private inferCategoryFromName(name: string): string {
    const normalizedName = name.toLowerCase();
    
    // 分类关键词映射
    const categoryKeywords: Record<string, string[]> = {
      'Streaming': ['netflix', 'youtube', 'bilibili', 'b站', '优酷', '爱奇艺', '腾讯视频', 'hulu', 'disney', 'hbo', 'prime video', '芒果', '咪咕'],
      'Music': ['音乐', 'music', 'spotify', '网易云', 'apple music', 'qq音乐', '酷狗', '酷我', '虾米', 'tidal'],
      'Gaming': ['游戏', 'game', 'steam', 'xbox', 'playstation', 'psn', 'nintendo', 'switch', 'epic', '原神', '王者'],
      'Productivity': ['office', 'notion', 'evernote', '印象笔记', 'todoist', 'trello', 'asana', 'slack', 'zoom', 'teams', '钉钉', '飞书', '企业微信', 'wps'],
      'Development': ['github', 'gitlab', 'csdn', 'jetbrains', 'idea', 'vscode', 'cursor', 'copilot', '开发', 'dev', 'coding', 'gitee', 'npm', 'docker'],
      'Design': ['adobe', 'figma', 'sketch', 'canva', 'photoshop', 'illustrator', '设计', 'design', 'ui', 'ux'],
      'Cloud': ['云', 'cloud', 'aws', 'azure', 'gcp', 'icloud', 'dropbox', 'onedrive', '百度网盘', '阿里云盘', '夸克'],
      'AI': ['openai', 'chatgpt', 'claude', 'midjourney', 'copilot', 'ai', '智谱', '文心', 'kimi', 'poe'],
      'Education': ['学习', 'learn', '教育', 'education', 'coursera', 'udemy', '得到', '知乎', '喜马拉雅', 'duolingo', 'masterclass'],
      'Health': ['健康', 'health', '运动', 'fitness', 'keep', '健身', '小米运动', '华为运动'],
      'Security': ['vpn', '安全', 'security', 'password', '1password', 'lastpass', 'nordvpn', 'expressvpn'],
      'Social': ['会员', 'vip', 'qq', '微博', 'twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', '抖音', '小红书'],
      'Reading': ['kindle', '阅读', 'reading', '微信读书', '书', 'book', '起点', '番茄'],
    };
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => normalizedName.includes(keyword))) {
        return category;
      }
    }
    
    return 'Other';
  }
}
