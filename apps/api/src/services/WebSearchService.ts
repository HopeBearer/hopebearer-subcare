import axios from 'axios';
import { SearchCacheRepository } from '../repositories/SearchCacheRepository';
import { SearchWebParams, SearchWebResult, SearchWebError } from '../infrastructure/ai/tools/ToolDefinitions';

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  query: string;
  response_time: number;
}

export class WebSearchService {
  private readonly TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  private readonly TAVILY_API_URL = 'https://api.tavily.com/search';

  constructor(private cacheRepository: SearchCacheRepository) {}

  /**
   * 执行Web搜索
   */
  async search(params: SearchWebParams): Promise<SearchWebResult | SearchWebError> {
    const { query, search_type, max_results = 3 } = params;

    // 1. 检查API Key配置
    if (!this.TAVILY_API_KEY) {
      return {
        error: 'API_NOT_CONFIGURED',
        message: 'Tavily API key is not configured. Using AI internal knowledge instead.',
        fallback: true
      };
    }

    // 2. 检查配额
    const hasQuota = await this.cacheRepository.hasQuota();
    if (!hasQuota) {
      return {
        error: 'QUOTA_EXCEEDED',
        message: 'Monthly search quota exceeded. Using AI internal knowledge instead.',
        fallback: true
      };
    }

    // 3. 检查缓存
    const cachedResults = await this.cacheRepository.get(query, search_type);
    if (cachedResults) {
      const usage = await this.cacheRepository.getMonthlyUsage();
      return {
        results: cachedResults as SearchWebResult['results'],
        search_time: new Date().toISOString(),
        quota_remaining: usage.remaining,
        from_cache: true
      };
    }

    // 4. 优化查询关键词
    const optimizedQuery = this.optimizeQuery(query, search_type);

    // 5. 调用 Tavily API
    try {
      const response = await axios.post<TavilyResponse>(
        this.TAVILY_API_URL,
        {
          api_key: this.TAVILY_API_KEY,
          query: optimizedQuery,
          search_depth: 'basic',
          max_results: Math.min(max_results, 5),
          include_answer: false,
          include_raw_content: false
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // 6. 格式化结果
      const results = response.data.results.map(r => ({
        title: r.title,
        snippet: r.content.slice(0, 300), // 限制摘要长度
        url: r.url,
        source: this.extractDomain(r.url)
      }));

      // 7. 更新使用计数
      const usage = await this.cacheRepository.incrementUsage();

      // 8. 缓存结果 (24小时)
      await this.cacheRepository.set({
        query,
        searchType: search_type,
        results
      }, 24);

      return {
        results,
        search_time: new Date().toISOString(),
        quota_remaining: usage.remaining,
        from_cache: false
      };
    } catch (error: any) {
      console.error('[WebSearchService] Tavily API error:', error.response?.data || error.message);
      
      // API错误时返回降级响应
      return {
        error: 'SEARCH_FAILED',
        message: `Search failed: ${error.message}. Using AI internal knowledge instead.`,
        fallback: true
      };
    }
  }

  /**
   * 根据搜索类型优化查询关键词
   */
  private optimizeQuery(query: string, searchType?: string): string {
    const suffixes: Record<string, string> = {
      pricing: '价格 定价 price monthly cost',
      promotion: '优惠 折扣 promotion discount offer',
      alternative: '替代品 alternative vs compare',
      general: ''
    };

    const suffix = suffixes[searchType || 'general'] || '';
    return suffix ? `${query} ${suffix}` : query;
  }

  /**
   * 从URL提取域名
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * 获取当前配额状态
   */
  async getQuotaStatus(): Promise<{ count: number; limit: number; remaining: number }> {
    return this.cacheRepository.getMonthlyUsage();
  }
}
