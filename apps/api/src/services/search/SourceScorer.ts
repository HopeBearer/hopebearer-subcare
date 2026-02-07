/**
 * SourceScorer - 信源评分与分级系统
 * 
 * 对搜索结果按信源可信度进行评分和分级，过滤低质量来源。
 * 
 * 评分维度：
 * - domainScore (0-50)：域名可信度
 * - freshnessScore (0-20)：内容新鲜度
 * - contentScore (0-10)：内容丰富度
 * - relevanceScore (0-20)：价格相关性
 */

export type SourceTier = 'S' | 'A' | 'B' | 'C' | 'D';

export interface RawSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string; // domain
}

export interface ScoredResult extends RawSearchResult {
  score: number;
  tier: SourceTier;
  domainScore: number;
  freshnessScore: number;
  contentScore: number;
  relevanceScore: number;
}

// ============ 域名分级规则 ============

/**
 * S 级：官方网站 — 需要根据搜索的服务名动态匹配
 * 由调用者传入 officialDomain
 */

/**
 * A 级：知名科技/评测/软件比价站
 */
const TIER_A_DOMAINS = new Set([
  // 科技媒体
  'techcrunch.com', 'theverge.com', 'arstechnica.com', 'wired.com',
  'engadget.com', 'zdnet.com', 'tomshardware.com',
  // 评测站
  'pcmag.com', 'cnet.com', 'techradar.com', 'tomsguide.com',
  // 软件评测/比价
  'g2.com', 'capterra.com', 'trustpilot.com', 'producthunt.com',
  'alternativeto.com', 'slant.co',
  // 官方文档
  'docs.github.com', 'developer.apple.com', 'support.google.com',
  'support.microsoft.com', 'help.netflix.com',
]);

/**
 * B 级：社区/问答/开发者平台
 */
const TIER_B_DOMAINS = new Set([
  'stackoverflow.com', 'reddit.com', 'quora.com', 'v2ex.com',
  'github.com', 'gitlab.com', 'news.ycombinator.com',
  'zhihu.com', 'douban.com',
  'wikipedia.org', 'wikiwand.com',
]);

/**
 * C 级：博客平台/个人博客
 */
const TIER_C_DOMAINS = new Set([
  'medium.com', 'dev.to', 'hashnode.dev', 'substack.com',
  'csdn.net', 'cnblogs.com', 'jianshu.com', 'segmentfault.com',
  'juejin.cn', 'oschina.net',
  'wordpress.com', 'blogspot.com', 'tumblr.com',
]);

/**
 * D 级特征：低质量采集/垃圾站
 */
const TIER_D_PATTERNS = [
  /seo|copy|mirror|proxy|cached|archive|scrape/i,
  /\d{8,}/, // 域名中有很长的数字
  /free-?download|crack|keygen|serial/i,
  /\.xyz$|\.top$|\.click$|\.buzz$/i, // 可疑 TLD
];

/**
 * 判断域名等级
 */
function getDomainTier(
  domain: string,
  officialDomains: string[] = []
): { tier: SourceTier; score: number } {
  const lowerDomain = domain.toLowerCase().replace(/^www\./, '');

  // S 级：官方域名
  for (const official of officialDomains) {
    if (lowerDomain === official.toLowerCase() || lowerDomain.endsWith('.' + official.toLowerCase())) {
      return { tier: 'S', score: 50 };
    }
  }

  // 也检查域名是否直接包含服务名的域名部分
  // 例如搜索 "Spotify" → spotify.com 自动 S 级
  if (TIER_A_DOMAINS.has(lowerDomain)) {
    return { tier: 'A', score: 40 };
  }

  if (TIER_B_DOMAINS.has(lowerDomain)) {
    return { tier: 'B', score: 30 };
  }

  if (TIER_C_DOMAINS.has(lowerDomain)) {
    return { tier: 'C', score: 20 };
  }

  // D 级检测
  for (const pattern of TIER_D_PATTERNS) {
    if (pattern.test(lowerDomain)) {
      return { tier: 'D', score: 10 };
    }
  }

  // 未知域名：默认 C 级（可能是某个服务的官方域名，也可能是小站）
  return { tier: 'C', score: 20 };
}

/**
 * 新鲜度评分：从 snippet/title 中提取年份
 */
function scoreFreshness(text: string): number {
  const currentYear = new Date().getFullYear();
  // 提取所有 4 位年份
  const yearMatches = text.match(/20[2-3]\d/g);
  if (!yearMatches || yearMatches.length === 0) return 10; // 无年份信息

  const latestYear = Math.max(...yearMatches.map(Number));
  const diff = currentYear - latestYear;

  if (diff <= 0) return 20;  // 当年或更新
  if (diff === 1) return 15; // 去年
  if (diff === 2) return 10; // 前年
  return 5;                  // 更早
}

/**
 * 内容丰富度评分
 */
function scoreContent(snippet: string): number {
  const length = snippet.length;
  if (length >= 200) return 10;
  if (length >= 100) return 7;
  if (length >= 50) return 4;
  return 2;
}

/**
 * 价格相关性评分
 */
function scoreRelevance(text: string): number {
  let score = 0;

  // 包含价格数字模式
  if (/(?:\$|¥|USD|CNY|EUR|€|￥)\s*\d+(?:\.\d{1,2})?/i.test(text)) {
    score += 12;
  } else if (/\d+(?:\.\d{1,2})?\s*(?:元|美元|美金|\/月|\/年|per\s*month|per\s*year|\/mo|\/yr)/i.test(text)) {
    score += 10;
  }

  // 包含定价关键词
  if (/pric(?:e|ing)|cost|plan|subscription|membership|free\s*trial/i.test(text)) {
    score += 5;
  }

  // 包含具体计划名
  if (/premium|basic|pro|family|student|individual|enterprise|starter|free\s*tier/i.test(text)) {
    score += 3;
  }

  return Math.min(score, 20);
}

/**
 * 对搜索结果进行评分和排序
 * 
 * @param results 原始搜索结果
 * @param serviceName 搜索的服务名（用于官方域名自动 S 级）
 * @param officialDomains 已知官方域名列表
 * @returns 评分、排序后的结果（已过滤 D 级）
 */
export function scoreAndRankResults(
  results: RawSearchResult[],
  serviceName: string,
  officialDomains: string[] = []
): ScoredResult[] {
  // 自动将服务名推导的域名加入 S 级候选
  const allOfficialDomains = [...officialDomains];
  const serviceNameLower = serviceName.toLowerCase().replace(/\s+/g, '');
  // 如果服务名看起来像域名的一部分（如 "spotify" → "spotify.com"），自动加入
  if (/^[a-z0-9]+$/i.test(serviceNameLower) && serviceNameLower.length >= 3) {
    allOfficialDomains.push(`${serviceNameLower}.com`);
    allOfficialDomains.push(`${serviceNameLower}.io`);
    allOfficialDomains.push(`${serviceNameLower}.org`);
  }

  const scored: ScoredResult[] = results.map(r => {
    const combinedText = `${r.title} ${r.snippet}`;
    const { tier, score: domainScore } = getDomainTier(r.source, allOfficialDomains);
    const freshnessScore = scoreFreshness(combinedText);
    const contentScore = scoreContent(r.snippet);
    const relevanceScore = scoreRelevance(combinedText);

    return {
      ...r,
      domainScore,
      freshnessScore,
      contentScore,
      relevanceScore,
      score: domainScore + freshnessScore + contentScore + relevanceScore,
      tier,
    };
  });

  // 过滤 D 级来源
  const filtered = scored.filter(r => r.tier !== 'D');

  // 按总分降序排列
  filtered.sort((a, b) => b.score - a.score);

  return filtered;
}

/**
 * 获取结果池中最高的信源等级
 */
export function getTopTier(results: ScoredResult[]): SourceTier {
  if (results.length === 0) return 'D';
  const tierOrder: SourceTier[] = ['S', 'A', 'B', 'C', 'D'];
  for (const tier of tierOrder) {
    if (results.some(r => r.tier === tier)) return tier;
  }
  return 'D';
}
