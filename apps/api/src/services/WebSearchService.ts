import axios from 'axios';
import { SearchCacheRepository } from '../repositories/SearchCacheRepository';
import { SearchWebParams, SearchWebResult, SearchWebError } from '../infrastructure/ai/tools/ToolDefinitions';
import { generateSearchQueries, getOfficialDomain } from './search/SearchQueryGenerator';
import { scoreAndRankResults, getTopTier, RawSearchResult, ScoredResult } from './search/SourceScorer';
import { extractEvidence, deduplicatePrices, Evidence, PriceEvidence } from './search/EvidenceExtractor';

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
   * 执行增强版搜索（多查询并行 + 信源评分 + 证据抽取）
   */
  async search(params: SearchWebParams): Promise<SearchWebResult | SearchWebError> {
    const { query, search_type = 'pricing', max_results = 3 } = params;

    // 1. 检查 API Key
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

    // 3. 检查缓存（整个增强结果缓存）
    const cacheKey = `enhanced:${query}:${search_type}`;
    const cachedResults = await this.cacheRepository.get(cacheKey, search_type);
    if (cachedResults) {
      const usage = await this.cacheRepository.getMonthlyUsage();
      const cached = cachedResults as SearchWebResult;
      cached.metadata.fromCache = true;
      cached.metadata.quotaRemaining = usage.remaining;
      return cached;
    }

    // 4. 生成多角度英文查询
    const generated = generateSearchQueries(query, search_type);
    const officialDomain = getOfficialDomain(generated.detectedService);
    const officialDomains = officialDomain ? [officialDomain] : [];

    console.log(`[WebSearchService] Generated queries for "${query}":`, generated.queries);

    // 5. 并行搜索
    let allRawResults: RawSearchResult[] = [];
    let tavilyCallsUsed = 0;

    try {
      const searchPromises = generated.queries.map(q =>
        this.callTavily(q, Math.min(max_results, 5))
          .then(results => {
            tavilyCallsUsed++;
            return results;
          })
          .catch(err => {
            console.warn(`[WebSearchService] Query "${q}" failed:`, err.message);
            return [] as RawSearchResult[];
          })
      );

      const resultSets = await Promise.all(searchPromises);
      allRawResults = this.mergeAndDeduplicate(resultSets.flat());

      // 更新配额计数（每次 Tavily 调用算一次）
      for (let i = 0; i < tavilyCallsUsed; i++) {
        await this.cacheRepository.incrementUsage();
      }
    } catch (error: any) {
      console.error('[WebSearchService] Parallel search failed:', error.message);
      return {
        error: 'SEARCH_FAILED',
        message: `Search failed: ${error.message}. Using AI internal knowledge instead.`,
        fallback: true
      };
    }

    if (allRawResults.length === 0) {
      return {
        error: 'NO_RESULTS',
        message: `No search results found for "${query}". Using AI internal knowledge instead.`,
        fallback: true
      };
    }

    // 6. 信源评分与排序（过滤 D 级）
    const scoredResults = scoreAndRankResults(allRawResults, generated.detectedService, officialDomains);
    const topTier = getTopTier(scoredResults);

    console.log(`[WebSearchService] Scored ${allRawResults.length} results → ${scoredResults.length} after D-tier filter. Top tier: ${topTier}`);

    // 7. 证据抽取
    const extraction = extractEvidence(scoredResults);
    const uniquePrices = deduplicatePrices(extraction.allPrices);

    // 8. 构建增强结果
    const usage = await this.cacheRepository.getMonthlyUsage();
    const enhancedResult: SearchWebResult = {
      evidences: extraction.evidences,
      summary: {
        serviceName: generated.detectedService,
        queriesUsed: generated.queries,
        totalSourcesFound: allRawResults.length,
        sourcesAfterFilter: scoredResults.length,
        topTier,
        pricesFound: uniquePrices,
      },
      rankedResults: scoredResults.slice(0, 8).map(r => ({
        title: r.title,
        snippet: r.snippet,
        url: r.url,
        source: r.source,
        score: r.score,
        tier: r.tier,
      })),
      metadata: {
        searchTime: new Date().toISOString(),
        quotaRemaining: usage.remaining,
        fromCache: false,
        tavilyCallsUsed,
      },
      instruction: this.buildInstruction(topTier, uniquePrices.length, extraction.factCount),
    };

    // 9. 缓存结果（24 小时）
    await this.cacheRepository.set({
      query: cacheKey,
      searchType: search_type,
      results: enhancedResult
    }, 24);

    return enhancedResult;
  }

  /**
   * 调用 Tavily API（单次）
   */
  private async callTavily(query: string, maxResults: number): Promise<RawSearchResult[]> {
    const response = await axios.post<TavilyResponse>(
      this.TAVILY_API_URL,
      {
        api_key: this.TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false
      },
      {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return response.data.results.map(r => ({
      title: r.title,
      snippet: r.content.slice(0, 400), // 证据抽取需要更多内容
      url: r.url,
      source: this.extractDomain(r.url)
    }));
  }

  /**
   * 合并并去重搜索结果（按 URL 去重）
   */
  private mergeAndDeduplicate(results: RawSearchResult[]): RawSearchResult[] {
    const seen = new Map<string, RawSearchResult>();
    for (const r of results) {
      const normalizedUrl = r.url.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\/www\./, 'https://');
      if (!seen.has(normalizedUrl)) {
        seen.set(normalizedUrl, r);
      } else {
        // 保留 snippet 更长的版本
        const existing = seen.get(normalizedUrl)!;
        if (r.snippet.length > existing.snippet.length) {
          seen.set(normalizedUrl, r);
        }
      }
    }
    return Array.from(seen.values());
  }

  /**
   * 构建 LLM 指令
   */
  private buildInstruction(topTier: string, priceCount: number, factCount: number): string {
    const parts: string[] = [];

    parts.push('⚠️ EVIDENCE-BASED ANSWERING RULE:');
    parts.push('You MUST answer ONLY based on the evidence provided below.');
    parts.push('Do NOT add information from your training data about pricing.');
    parts.push('If the evidence is insufficient, tell the user explicitly.');

    if (topTier === 'S') {
      parts.push('✅ Official source found — use its data with high confidence.');
    } else if (topTier === 'A') {
      parts.push('ℹ️ No official source found, but reputable review sites available.');
    } else {
      parts.push('⚠️ No official or authoritative source found — present data with caveats.');
    }

    if (priceCount > 0) {
      parts.push(`Found ${priceCount} price point(s) in the evidence.`);
    } else {
      parts.push('⚠️ No specific prices extracted. Ask user to provide the price or check the official website.');
    }

    return parts.join('\n');
  }

  /**
   * 从 URL 提取域名
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
