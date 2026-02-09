import { ToolDefinition } from '../interfaces/LLMProvider';

/**
 * AI Agent Tools Definitions
 * 定义所有可用的工具及其 JSON Schema
 */

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // 1. 汇率转换工具
  {
    type: 'function',
    function: {
      name: 'convert_currency',
      description: '将金额从一种货币转换为另一种货币，使用实时汇率数据。当需要比较不同货币的订阅价格或计算统一货币的总支出时使用此工具。',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: '要转换的金额'
          },
          from_currency: {
            type: 'string',
            description: '源货币代码，如 USD, EUR, CNY, GBP, JPY 等'
          },
          to_currency: {
            type: 'string',
            description: '目标货币代码，如 USD, EUR, CNY, GBP, JPY 等'
          }
        },
        required: ['amount', 'from_currency', 'to_currency']
      }
    }
  },

  // 2. Web搜索工具（增强版：多查询并行 + 信源评分 + 证据抽取）
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: `Search the internet for up-to-date pricing, promotions, alternatives, or general info about a service/product.
This tool uses an enhanced pipeline:
1. Automatically generates 2-3 English search queries from your input (Chinese is auto-translated).
2. Executes parallel searches for comprehensive coverage.
3. Scores and ranks sources (S/A/B/C tiers; D-tier spam is discarded).
4. Extracts structured evidence: prices, plans, billing cycles.
The result contains an "instruction" field — you MUST follow it when composing your answer.
Use ONLY the evidence/facts returned by this tool. Do NOT add pricing info from your training data.
Note: search quota is limited; use wisely.`,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query — can be in any language (Chinese will be auto-translated to English). Be specific, e.g. "Spotify Premium pricing 2026" or "CSDN会员价格"'
          },
          search_type: {
            type: 'string',
            enum: ['pricing', 'promotion', 'alternative', 'general'],
            description: 'Search type: pricing (price lookup), promotion (deals/discounts), alternative (competing services), general (other info)'
          },
          max_results: {
            type: 'number',
            description: 'Max results per query (default 3, max 5). Total results may be higher due to multi-query.'
          }
        },
        required: ['query']
      }
    }
  },

  // 3. 订阅历史查询工具
  {
    type: 'function',
    function: {
      name: 'get_subscription_history',
      description: '查询用户某个订阅的历史价格变化和付款记录。用于分析订阅是否涨价、计算历史支出等。',
      parameters: {
        type: 'object',
        properties: {
          subscription_name: {
            type: 'string',
            description: '订阅名称，支持模糊匹配，如 "Netflix"、"Spotify"、"iCloud"'
          },
          months: {
            type: 'number',
            description: '查询最近几个月的数据，默认6个月，最大24个月'
          }
        },
        required: ['subscription_name']
      }
    }
  },

  // 4. 订阅服务查询工具（语义搜索）
  {
    type: 'function',
    function: {
      name: 'lookup_subscription_service',
      description: '通过语义搜索识别订阅服务，返回服务的预设信息（价格、图标、网站等）。支持名称、别名、描述等多种输入。示例: "网飞" → Netflix, "音乐会员" → Spotify。添加订阅前先调用此工具获取服务信息。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '用户描述的服务名称或特征，如 "网飞"、"音乐会员"、"iCloud存储"'
          }
        },
        required: ['query']
      }
    }
  },

  // 5. 快速添加订阅工具
  {
    type: 'function',
    function: {
      name: 'quick_add_subscription',
      description: `快速添加订阅。用户说"添加"就直接添加，不要反复确认。
⚠️ 价格规则：如果 lookup_subscription_service 没找到模板，请不要传 price 参数！只有用户明确说了具体价格时才传 price。
📝 如果检测到已有类似订阅，工具会照常创建并返回 duplicateWarning 提醒。
📅 日期规则：如果用户指定了过去的日期，系统不会回填历史记录，而是从下一个计费周期开始追踪。创建后请询问用户以前大概花了多少钱，并用 update_subscription 工具记录 historicalSpending。
🔧 设置规则：必须传递用户明确指定的所有设置（autoRenewal、enableNotification、notifyDaysBefore、category 等），不要丢弃用户提供的信息。
📂 分类映射：工具(Tools)、流媒体(Streaming)、娱乐(Entertainment)、生产力(Productivity)、云服务(Cloud)、开发(Development)、音乐(Music)、游戏(Gaming)、教育(Education)、其他(Other)`,
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '服务名称，如 "Netflix"、"Spotify"'
          },
          price: {
            type: 'number',
            description: '⚠️ 只有用户明确提供价格时才填写此参数！不要猜测或编造价格。如果没有模板，工具会自动搜索网络获取价格。'
          },
          currency: {
            type: 'string',
            description: '货币代码（可选，默认用户设置的货币）'
          },
          billingCycle: {
            type: 'string',
            enum: ['Monthly', 'Yearly', 'Weekly', 'Daily'],
            description: '计费周期（可选，默认 Monthly）'
          },
          category: {
            type: 'string',
            description: '分类名称（可选），如：Streaming（流媒体）、Entertainment（娱乐）、Tools（工具）、Productivity（生产力）、Cloud（云服务）、Development（开发）、Music（音乐）、Gaming（游戏）、Education（教育）、Other（其他）'
          },
          website: {
            type: 'string',
            description: '网站URL（可选）'
          },
          icon: {
            type: 'string',
            description: '图标emoji（可选）'
          },
          startDate: {
            type: 'string',
            description: '开始日期，ISO格式（可选，默认今天）'
          },
          autoRenewal: {
            type: 'boolean',
            description: '是否自动续费（可选，默认 true）。用户说"不续费"/"不自动续费"/"关闭自动续费"时设为 false'
          },
          enableNotification: {
            type: 'boolean',
            description: '是否启用续费提醒通知（可选，默认 false）'
          },
          notifyDaysBefore: {
            type: 'number',
            description: '提前几天发送续费提醒（可选，仅在 enableNotification=true 时有效）'
          },
          allowDuplicate: {
            type: 'boolean',
            description: '是否允许创建重复订阅（仅在用户明确确认后才可设置为 true）'
          }
        },
        required: ['name']
      }
    }
  },

  // 6. 搜索我的订阅工具
  {
    type: 'function',
    function: {
      name: 'search_my_subscriptions',
      description: '搜索用户的订阅列表。不传任何参数则返回所有订阅。可通过 filters 筛选。示例用法：查所有订阅→不传参数；按分类查→filters.category；按名字查→filters.nameSearch；按价格排序→filters.sortBy="price_desc"',
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            properties: {
              nameSearch: {
                type: 'string',
                description: '按订阅名称模糊搜索，如 "Netflix"、"Spotify"'
              },
              category: {
                type: 'string',
                description: '按分类名称过滤，如 "Streaming"、"Productivity"'
              },
              status: {
                type: 'string',
                enum: ['ACTIVE', 'PAUSED', 'CANCELLED'],
                description: '按状态过滤'
              },
              minPrice: {
                type: 'number',
                description: '最低价格过滤'
              },
              maxPrice: {
                type: 'number',
                description: '最高价格过滤'
              },
              sortBy: {
                type: 'string',
                enum: ['price_asc', 'price_desc', 'name_asc', 'next_payment_asc'],
                description: '排序方式：price_asc(价格升序)、price_desc(价格降序)、name_asc(名称)、next_payment_asc(续费日期最近)'
              }
            }
          }
        }
      }
    }
  },

  // 7. 取消订阅工具
  {
    type: 'function',
    function: {
      name: 'cancel_subscription',
      description: '取消/删除订阅，支持名称或ID。默认执行软删除（状态改为CANCELLED），hardDelete=true 时永久删除。',
      parameters: {
        type: 'object',
        properties: {
          nameOrId: {
            type: 'string',
            description: '订阅名称或ID'
          },
          hardDelete: {
            type: 'boolean',
            description: '是否永久删除（默认 false = 软删除，改状态为CANCELLED）'
          }
        },
        required: ['nameOrId']
      }
    }
  },

  // 8. 支出摘要工具
  {
    type: 'function',
    function: {
      name: 'get_spending_summary',
      description: '获取用户订阅支出摘要统计。当 period=this_month 时，totalSpend/byCategory/topSubscriptions 全部基于本月实际支付记录（与仪表盘完全一致），附带 monthlyEquivalentTotal 月度等价参考。其他 period 则使用月度等价计算。',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['this_month', 'last_month', 'this_year', 'all_time'],
            description: '统计周期：this_month(本月)、last_month(上月)、this_year(今年)、all_time(全部)'
          }
        }
      }
    }
  },

  // 9. 更新订阅工具
  {
    type: 'function',
    function: {
      name: 'update_subscription',
      description: '更新现有订阅的信息，如价格、计费周期、状态、分类等。需要先通过 search_my_subscriptions 找到订阅ID。',
      parameters: {
        type: 'object',
        properties: {
          subscriptionId: {
            type: 'string',
            description: '订阅ID（必须通过 search_my_subscriptions 获取）'
          },
          name: {
            type: 'string',
            description: '新名称（可选）'
          },
          price: {
            type: 'number',
            description: '新价格（可选）'
          },
          currency: {
            type: 'string',
            description: '新货币代码（可选）'
          },
          billingCycle: {
            type: 'string',
            enum: ['Monthly', 'Yearly', 'Weekly', 'Daily'],
            description: '新计费周期（可选）'
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'PAUSED'],
            description: '订阅状态：ACTIVE(活跃) 或 PAUSED(暂停)'
          },
          category: {
            type: 'string',
            description: '订阅分类，如：Streaming（流媒体）、Entertainment（娱乐）、Tools（工具）、Productivity（生产力）、Cloud（云服务）、Utility（实用工具）、Education（教育）、Other（其他）'
          },
          autoRenewal: {
            type: 'boolean',
            description: '是否自动续费。true=自动续费（到期自动进入下一周期），false=不自动续费（到期后订阅过期）'
          },
          enableNotification: {
            type: 'boolean',
            description: '是否启用续费提醒'
          },
          notifyDaysBefore: {
            type: 'number',
            description: '提前几天提醒续费'
          },
          notes: {
            type: 'string',
            description: '备注'
          },
          historicalSpending: {
            type: 'number',
            description: '用户自填的历史累计花费金额（用于记录系统追踪之前的花费）'
          },
          historicalNote: {
            type: 'string',
            description: '历史花费备注，如"2023-2025年期间订阅"'
          }
        },
        required: ['subscriptionId']
      }
    }
  },

  // 10. 获取即将续费订阅工具
  {
    type: 'function',
    function: {
      name: 'get_upcoming_renewals',
      description: '获取即将续费的订阅列表，用于提醒用户近期需要付款的订阅。',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: '查询未来几天内到期的订阅，默认7天，最大30天'
          }
        }
      }
    }
  },

  // 11. 暂停订阅工具
  {
    type: 'function',
    function: {
      name: 'pause_subscription',
      description: '暂停订阅（将状态改为 PAUSED），订阅不会被删除，可以稍后恢复。',
      parameters: {
        type: 'object',
        properties: {
          nameOrId: {
            type: 'string',
            description: '订阅名称或ID'
          }
        },
        required: ['nameOrId']
      }
    }
  },

  // 12. 恢复订阅工具
  {
    type: 'function',
    function: {
      name: 'resume_subscription',
      description: '恢复已暂停的订阅（将状态改为 ACTIVE）。',
      parameters: {
        type: 'object',
        properties: {
          nameOrId: {
            type: 'string',
            description: '订阅名称或ID'
          }
        },
        required: ['nameOrId']
      }
    }
  },

  // 13. 查询系统分类列表工具
  {
    type: 'function',
    function: {
      name: 'list_categories',
      description: '获取系统中所有可用的分类列表。注意区分：1) "总共有多少分类"、"有哪些分类可选"、"系统分类列表" 等问题应使用此工具查询所有可用分类；2) "我的订阅有哪些分类"、"订阅按分类统计" 等问题应使用 get_spending_summary 工具查看已使用的分类统计。',
      parameters: {
        type: 'object',
        properties: {
          includeStats: {
            type: 'boolean',
            description: '是否包含每个分类下的订阅数量统计（默认 false）'
          }
        }
      }
    }
  },

  // 14. 确认账单支付工具
  {
    type: 'function',
    function: {
      name: 'confirm_bill_payment',
      description: '确认账单已支付。将账单状态从 PENDING 更改为 PAID，并自动推进订阅的下次付款日期。可选择性修改实际支付金额和日期。',
      parameters: {
        type: 'object',
        properties: {
          subscriptionNameOrId: {
            type: 'string',
            description: '订阅名称或ID，用于查找对应的待支付账单'
          },
          actualAmount: {
            type: 'number',
            description: '实际支付金额（可选，如果不同于账单金额）'
          },
          actualDate: {
            type: 'string',
            description: '实际支付日期，ISO格式（可选，默认为账单日期）'
          }
        },
        required: ['subscriptionNameOrId']
      }
    }
  },

  // 15. 取消账单支付工具
  {
    type: 'function',
    function: {
      name: 'cancel_bill_payment',
      description: '取消待支付账单（用户明确表示不支付/取消缴费）。将账单标记为取消并同步取消对应订阅的续费，可写入备注。',
      parameters: {
        type: 'object',
        properties: {
          billId: {
            type: 'string',
            description: '账单ID（通过 get_pending_bills 获取）'
          },
          subscriptionNameOrId: {
            type: 'string',
            description: '订阅名称或ID（当未提供 billId 时使用）'
          },
          note: {
            type: 'string',
            description: '取消原因备注（可选）'
          }
        }
      }
    }
  },

  // 16. 取消所有待支付账单工具
  {
    type: 'function',
    function: {
      name: 'cancel_all_pending_bills',
      description: '取消所有待支付账单（批量）。将所有待支付账单标记为取消并同步取消对应订阅的续费，可写入统一备注。',
      parameters: {
        type: 'object',
        properties: {
          note: {
            type: 'string',
            description: '取消原因备注（可选）'
          }
        }
      }
    }
  },

  // 17. 获取待支付账单工具
  {
    type: 'function',
    function: {
      name: 'get_pending_bills',
      description: '获取用户的待支付账单列表。可按订阅名称过滤。用于查看哪些账单需要确认支付。',
      parameters: {
        type: 'object',
        properties: {
          subscriptionName: {
            type: 'string',
            description: '订阅名称（可选，用于过滤特定订阅的账单）'
          },
          limit: {
            type: 'number',
            description: '返回数量限制，默认10'
          }
        }
      }
    }
  },

  // 18. 更新账单工具
  {
    type: 'function',
    function: {
      name: 'update_bill',
      description: '更新待支付账单的信息，如金额、日期、备注等。只能更新 PENDING 状态的账单。',
      parameters: {
        type: 'object',
        properties: {
          billId: {
            type: 'string',
            description: '账单ID（通过 get_pending_bills 获取）'
          },
          amount: {
            type: 'number',
            description: '新金额（可选）'
          },
          billingDate: {
            type: 'string',
            description: '新账单日期，ISO格式（可选）'
          },
          note: {
            type: 'string',
            description: '备注（可选）'
          }
        },
        required: ['billId']
      }
    }
  }
];

/**
 * 工具名称枚举
 */
export enum ToolName {
  CONVERT_CURRENCY = 'convert_currency',
  SEARCH_WEB = 'search_web',
  GET_SUBSCRIPTION_HISTORY = 'get_subscription_history',
  LOOKUP_SUBSCRIPTION_SERVICE = 'lookup_subscription_service',
  QUICK_ADD_SUBSCRIPTION = 'quick_add_subscription',
  SEARCH_MY_SUBSCRIPTIONS = 'search_my_subscriptions',
  CANCEL_SUBSCRIPTION = 'cancel_subscription',
  GET_SPENDING_SUMMARY = 'get_spending_summary',
  // 新增工具
  UPDATE_SUBSCRIPTION = 'update_subscription',
  GET_UPCOMING_RENEWALS = 'get_upcoming_renewals',
  PAUSE_SUBSCRIPTION = 'pause_subscription',
  RESUME_SUBSCRIPTION = 'resume_subscription',
  LIST_CATEGORIES = 'list_categories',
  // 账单相关工具
  CONFIRM_BILL_PAYMENT = 'confirm_bill_payment',
  CANCEL_BILL_PAYMENT = 'cancel_bill_payment',
  CANCEL_ALL_PENDING_BILLS = 'cancel_all_pending_bills',
  GET_PENDING_BILLS = 'get_pending_bills',
  UPDATE_BILL = 'update_bill'
}

/**
 * 工具调用参数类型
 */
export interface ConvertCurrencyParams {
  amount: number;
  from_currency: string;
  to_currency: string;
}

export interface SearchWebParams {
  query: string;
  search_type?: 'pricing' | 'promotion' | 'alternative' | 'general';
  max_results?: number;
}

export interface GetSubscriptionHistoryParams {
  subscription_name: string;
  months?: number;
}

// 新增工具参数类型
export interface LookupSubscriptionServiceParams {
  query: string;
}

export interface QuickAddSubscriptionParams {
  name: string;
  price?: number;
  currency?: string;
  billingCycle?: 'Monthly' | 'Yearly' | 'Weekly' | 'Daily';
  category?: string;
  website?: string;
  icon?: string;
  startDate?: string;
  autoRenewal?: boolean;
  enableNotification?: boolean;
  notifyDaysBefore?: number;
  allowDuplicate?: boolean;
}

export interface SearchMySubscriptionsParams {
  filters?: {
    nameSearch?: string;
    category?: string;
    status?: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price_asc' | 'price_desc' | 'name_asc' | 'next_payment_asc';
  };
}

export interface CancelSubscriptionParams {
  nameOrId: string;
  hardDelete?: boolean;
}

export interface GetSpendingSummaryParams {
  period?: 'this_month' | 'last_month' | 'this_year' | 'all_time';
}

// 新增工具参数类型
export interface UpdateSubscriptionParams {
  subscriptionId: string;
  name?: string;
  price?: number;
  currency?: string;
  billingCycle?: 'Monthly' | 'Yearly' | 'Weekly' | 'Daily';
  status?: 'ACTIVE' | 'PAUSED';
  category?: string; // 分类名称，如 Streaming, Entertainment, Tools 等
  autoRenewal?: boolean;
  enableNotification?: boolean;
  notifyDaysBefore?: number;
  notes?: string;
  historicalSpending?: number;
  historicalNote?: string;
}

export interface GetUpcomingRenewalsParams {
  days?: number;
}

export interface PauseSubscriptionParams {
  nameOrId: string;
}

export interface ResumeSubscriptionParams {
  nameOrId: string;
}

export interface ListCategoriesParams {
  includeStats?: boolean;
}

// 账单相关工具参数
export interface ConfirmBillPaymentParams {
  subscriptionNameOrId: string;
  actualAmount?: number;
  actualDate?: string;
}

export interface CancelBillPaymentParams {
  billId?: string;
  subscriptionNameOrId?: string;
  note?: string;
}

export interface CancelAllPendingBillsParams {
  note?: string;
}

export interface GetPendingBillsParams {
  subscriptionName?: string;
  limit?: number;
}

export interface UpdateBillParams {
  billId: string;
  amount?: number;
  billingDate?: string;
  note?: string;
}

/**
 * 工具执行结果类型
 */
export interface ConvertCurrencyResult {
  original_amount: number;
  original_currency: string;
  converted_amount: number;
  target_currency: string;
  exchange_rate: number;
  rate_updated_at: string | null;
}

/**
 * 增强版搜索结果 — 证据驱动（替代旧的 SearchWebResult）
 * 由 WebSearchService 的 EnhancedSearchResult 导出
 */
export interface SearchWebResult {
  /** 结构化证据列表 */
  evidences: Array<{
    source: string;
    sourceUrl: string;
    tier: 'S' | 'A' | 'B' | 'C' | 'D';
    facts: string[];
    prices: Array<{
      plan: string;
      amount: number;
      currency: string;
      cycle: string;
      raw: string;
    }>;
    confidence: 'high' | 'medium' | 'low';
  }>;
  /** 汇总信息 */
  summary: {
    serviceName: string;
    queriesUsed: string[];
    totalSourcesFound: number;
    sourcesAfterFilter: number;
    topTier: string;
    pricesFound: Array<{
      plan: string;
      amount: number;
      currency: string;
      cycle: string;
      raw: string;
    }>;
  };
  /** 评分排序后的搜索结果（供参考） */
  rankedResults: Array<{
    title: string;
    snippet: string;
    url: string;
    source: string;
    score: number;
    tier: string;
  }>;
  /** 元数据 */
  metadata: {
    searchTime: string;
    quotaRemaining: number;
    fromCache: boolean;
    tavilyCallsUsed: number;
  };
  /** LLM 指令：必须遵守的证据驱动回答规则 */
  instruction: string;
}

export interface SearchWebError {
  error: string;
  message: string;
  fallback: boolean;
}

export interface SubscriptionHistoryResult {
  subscription: {
    id: string;
    name: string;
    current_price: number;
    currency: string;
    billing_cycle: string;
    status: string;
  } | null;
  price_history: Array<{
    date: string;
    price: number;
    currency: string;
    change_percentage: number | null;
  }>;
  payment_records: Array<{
    date: string;
    amount: number;
    currency: string;
    status: string;
  }>;
  analysis: {
    has_price_increase: boolean;
    total_price_change_percentage: number;
    average_monthly_cost: number;
    total_spent: number;
    payment_count: number;
  };
  error?: string;
}

// 新增工具结果类型
export interface LookupSubscriptionServiceResult {
  found: boolean;
  matches: Array<{
    templateId: string;
    name: string;
    displayName?: string;
    category?: string;
    icon?: string;
    website?: string;
    pricingPlans?: Record<string, Record<string, number>>;
    defaultCurrency?: string;
    defaultCycle?: string;
    score: number;
  }>;
  bestMatch?: {
    name: string;
    displayName?: string;
    icon?: string;
    website?: string;
    suggestedPrice?: number;
    suggestedCurrency?: string;
    suggestedCycle?: string;
  };
  /** 提示消息（找不到时说明原因） */
  message?: string;
}

export interface QuickAddSubscriptionResult {
  success: boolean;
  subscription?: {
    id: string;
    name: string;
    price: number;
    currency: string;
    billingCycle: string;
    startDate: string;
    nextPayment?: string;
    expiryDate?: string;
    autoRenewal?: boolean;
    icon?: string;
    website?: string;
    category?: string;
  };
  error?: string;
  /** 如果存在重复订阅，返回所有相似订阅列表 */
  existingSubscriptions?: Array<{
    displayId: string;
    name: string;
    price: number;
    currency: string;
    billingCycle: string;
    status: string;
    startDate?: string;
    nextPayment?: string;
  }>;
  /** 重复订阅数量 */
  duplicateCount?: number;
  /** 
   * 重复警告信息（不阻断创建，只是提醒用户）。
   * AI 应在回复中告知用户已有类似订阅，如需管理可使用其他工具。
   */
  duplicateWarning?: string;
  /** 是否需要用户确认后才能创建重复订阅 */
  requiresDuplicateConfirmation?: boolean;
  /** 是否有待支付账单需要确认 */
  hasPendingBill?: boolean;
  /** 待支付账单信息 */
  pendingBill?: {
    id: string;
    amount: number;
    currency: string;
    billingDate: string;
  };
  /** AI 应该向用户询问的后续问题 */
  followUpQuestion?: string;
  /** 信息来源：template（模板）、web_search（网络搜索）、user_provided（用户提供） */
  infoSource?: 'template' | 'web_search' | 'user_provided';
  /** 是否尝试过网络搜索（用于 error 情况下告知 AI 已经搜索过了） */
  searchAttempted?: boolean;
  /** 是否需要先调用 search_web 工具获取价格 */
  requiresSearchWeb?: boolean;
  /** 建议的搜索查询（当 requiresSearchWeb=true 时） */
  suggestedSearchQuery?: string;
  /** AI 响应指南 */
  responseGuidelines?: {
    /** 是否显示价格来源 */
    showPriceSource?: boolean;
    /** 是否提供修改价格的选项（用户提供的价格可能需要确认） */
    offerToEditPrice?: boolean;
    /** 是否询问支付状态 */
    askAboutPayment?: boolean;
  };
}

export interface SearchMySubscriptionsResult {
  total: number;
  subscriptions: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    billingCycle: string;
    status: string;
    nextPayment?: string;
    category?: string;
    icon?: string;
  }>;
  summary?: {
    totalMonthlySpend: number;
    currency: string;
  };
}

export interface CancelSubscriptionResult {
  success: boolean;
  action: 'cancelled' | 'deleted';
  subscription?: {
    id: string;
    name: string;
  };
  error?: string;
}

export interface GetSpendingSummaryResult {
  period: string;
  periodLabel: string;
  /** 主金额：this_month 时为本月实际支付总额，其他 period 为月度等价总额 */
  totalSpend: number;
  /** 本月实际支付总额（基于 PaymentRecord，与仪表盘一致） */
  actualMonthlyPayment?: number;
  /** 月度等价总额（活跃订阅按账期折算为月费之和，仅 this_month 时返回作为参考） */
  monthlyEquivalentTotal?: number;
  currency: string;
  subscriptionCount: number;
  byCategory: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  topSubscriptions: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  comparison?: {
    previousPeriod: number;
    changePercentage: number;
    trend: 'up' | 'down' | 'stable';
  };
}

// 新增工具结果类型
export interface UpdateSubscriptionResult {
  success: boolean;
  subscription?: {
    id: string;
    name: string;
    price: number;
    currency: string;
    billingCycle: string;
    status: string;
    nextPayment?: string;
  };
  pendingBill?: {
    id: string;
    amount: number;
    currency: string;
    billingDate: string;
    status: string;
  };
  error?: string;
}

export interface GetUpcomingRenewalsResult {
  total: number;
  subscriptions: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    billingCycle: string;
    nextPayment: string;
    daysUntilRenewal: number;
    icon?: string;
  }>;
}

export interface PauseSubscriptionResult {
  success: boolean;
  subscription?: {
    id: string;
    name: string;
    status: string;
  };
  error?: string;
}

export interface ResumeSubscriptionResult {
  success: boolean;
  subscription?: {
    id: string;
    name: string;
    status: string;
    nextPayment?: string;
  };
  error?: string;
}

export interface ListCategoriesResult {
  total: number;
  categories: Array<{
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    isSystem: boolean; // true = 系统分类, false = 用户自定义分类
    subscriptionCount?: number; // 仅当 includeStats=true 时返回
  }>;
}

// 账单相关工具结果
export interface ConfirmBillPaymentResult {
  success: boolean;
  bill?: {
    id: string;
    subscriptionName: string;
    amount: number;
    currency: string;
    billingDate: string;
    status: string;
  };
  subscription?: {
    name: string;
    nextPayment?: string;
  };
  error?: string;
}

export interface CancelBillPaymentResult {
  success: boolean;
  bill?: {
    id: string;
    subscriptionName: string;
    amount: number;
    currency: string;
    billingDate: string;
    status: string;
    note?: string;
  };
  error?: string;
}

export interface CancelAllPendingBillsResult {
  success: boolean;
  count?: number;
  bills?: Array<{
    id: string;
    subscriptionName: string;
    amount: number;
    currency: string;
    billingDate: string;
    status: string;
    note?: string;
  }>;
  error?: string;
}

export interface GetPendingBillsResult {
  total: number;
  bills: Array<{
    id: string;
    subscriptionId: string;
    subscriptionName: string;
    amount: number;
    currency: string;
    billingDate: string;
    status: string;
    note?: string;
    icon?: string;
  }>;
}

export interface UpdateBillResult {
  success: boolean;
  bill?: {
    id: string;
    subscriptionName: string;
    amount: number;
    currency: string;
    billingDate: string;
    status: string;
    note?: string;
  };
  error?: string;
}
