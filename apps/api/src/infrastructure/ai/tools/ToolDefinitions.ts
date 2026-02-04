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

  // 2. Web搜索工具
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: '搜索互联网获取服务的最新定价、促销活动、替代品信息。当需要查询某个服务的当前价格、优惠活动或寻找替代方案时使用此工具。注意：搜索配额有限，请谨慎使用。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索查询，应该具体明确，如 "Spotify Premium 中国区价格 2026" 或 "Netflix 替代品推荐"'
          },
          search_type: {
            type: 'string',
            enum: ['pricing', 'promotion', 'alternative', 'general'],
            description: '搜索类型：pricing(价格查询)、promotion(优惠活动)、alternative(替代品)、general(通用搜索)'
          },
          max_results: {
            type: 'number',
            description: '最大返回结果数，默认3，最大5'
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
  }
];

/**
 * 工具名称枚举
 */
export enum ToolName {
  CONVERT_CURRENCY = 'convert_currency',
  SEARCH_WEB = 'search_web',
  GET_SUBSCRIPTION_HISTORY = 'get_subscription_history'
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

export interface SearchWebResult {
  results: Array<{
    title: string;
    snippet: string;
    url: string;
    source?: string;
  }>;
  search_time: string;
  quota_remaining: number;
  from_cache: boolean;
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
