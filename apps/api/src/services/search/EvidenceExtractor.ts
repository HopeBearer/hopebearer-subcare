/**
 * EvidenceExtractor - 结构化证据抽取
 * 
 * 从搜索结果 snippet 中提取结构化事实（价格、计划、周期等），
 * 而不是把原始 snippet 直接喂给 LLM。
 * 
 * 使用规则 + 正则，无需调用 LLM，速度快。
 */

import { ScoredResult, SourceTier } from './SourceScorer';

export interface PriceEvidence {
  plan: string;
  amount: number;
  currency: string;
  cycle: string;
  raw: string;
}

export interface Evidence {
  source: string;
  sourceUrl: string;
  tier: SourceTier;
  facts: string[];
  prices: PriceEvidence[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtractionResult {
  evidences: Evidence[];
  allPrices: PriceEvidence[];
  factCount: number;
}

// ============ 价格提取正则 ============

/**
 * 匹配各种价格格式：
 * - $9.99, $9.99/mo, $9.99/month
 * - USD 9.99, CNY 28
 * - ¥28, ¥28/月, ￥28
 * - 9.99元/月, 28元/年
 * - 9.99 per month, 9.99/yr
 */
const PRICE_PATTERNS: Array<{
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => Partial<PriceEvidence> | null;
}> = [
  // $9.99/month 或 $9.99/mo 或 $9.99 per month
  {
    pattern: /\$\s*(\d+(?:\.\d{1,2})?)\s*(?:\/|\s*per\s*)(mo(?:nth)?|yr|year|annually)/gi,
    extract: (m) => ({
      amount: parseFloat(m[1]),
      currency: 'USD',
      cycle: normalizeCycle(m[2]),
      raw: m[0],
    }),
  },
  // USD 9.99 或 USD9.99
  {
    pattern: /USD\s*(\d+(?:\.\d{1,2})?)\s*(?:\/?\s*(?:per\s*)?(mo(?:nth)?|yr|year|annually))?/gi,
    extract: (m) => ({
      amount: parseFloat(m[1]),
      currency: 'USD',
      cycle: m[2] ? normalizeCycle(m[2]) : 'unknown',
      raw: m[0],
    }),
  },
  // $9.99 (without cycle)
  {
    pattern: /\$\s*(\d+(?:\.\d{1,2})?)/g,
    extract: (m) => ({
      amount: parseFloat(m[1]),
      currency: 'USD',
      cycle: 'unknown',
      raw: m[0],
    }),
  },
  // ¥28/月 或 ￥28/年 或 ¥28元/月
  {
    pattern: /[¥￥]\s*(\d+(?:\.\d{1,2})?)\s*(?:元)?\s*(?:\/\s*)?(月|年|季)/g,
    extract: (m) => ({
      amount: parseFloat(m[1]),
      currency: 'CNY',
      cycle: normalizeCnCycle(m[2]),
      raw: m[0],
    }),
  },
  // CNY 28 或 CNY28
  {
    pattern: /CNY\s*(\d+(?:\.\d{1,2})?)\s*(?:\/?\s*(月|年|季|mo(?:nth)?|yr|year))?/gi,
    extract: (m) => ({
      amount: parseFloat(m[1]),
      currency: 'CNY',
      cycle: m[2] ? (isChinese(m[2]) ? normalizeCnCycle(m[2]) : normalizeCycle(m[2])) : 'unknown',
      raw: m[0],
    }),
  },
  // 28元/月 或 28元/年 (数字 + 元)
  {
    pattern: /(\d+(?:\.\d{1,2})?)\s*元\s*(?:\/\s*)?(月|年|季)?/g,
    extract: (m) => ({
      amount: parseFloat(m[1]),
      currency: 'CNY',
      cycle: m[2] ? normalizeCnCycle(m[2]) : 'unknown',
      raw: m[0],
    }),
  },
  // €9.99 或 EUR 9.99
  {
    pattern: /(?:€|EUR)\s*(\d+(?:\.\d{1,2})?)\s*(?:\/?\s*(?:per\s*)?(mo(?:nth)?|yr|year))?/gi,
    extract: (m) => ({
      amount: parseFloat(m[1]),
      currency: 'EUR',
      cycle: m[2] ? normalizeCycle(m[2]) : 'unknown',
      raw: m[0],
    }),
  },
  // 9.99 per month/year (no currency symbol)
  {
    pattern: /(\d+(?:\.\d{1,2})?)\s*per\s*(month|year|annum)/gi,
    extract: (m) => ({
      amount: parseFloat(m[1]),
      currency: 'USD', // 默认 USD
      cycle: normalizeCycle(m[2]),
      raw: m[0],
    }),
  },
];

// ============ 计划名称提取 ============

const PLAN_PATTERNS = [
  // 英文计划名
  /\b(Premium|Basic|Pro|Professional|Plus|Family|Student|Individual|Enterprise|Starter|Free|Standard|Essential|Business|Team|Ultimate|Lite|Gold|Silver|Platinum|Diamond)\b/gi,
  // 中文计划名
  /(超级会员|大会员|黄金会员|铂金会员|钻石会员|普通会员|VIP会员|SVIP|高级版|专业版|免费版|基础版|旗舰版|尊享版|标准版|连续包月|连续包年)/g,
];

// ============ 辅助函数 ============

function isChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function normalizeCycle(raw: string): string {
  const lower = raw.toLowerCase();
  if (/^mo/i.test(lower) || lower === 'month') return 'monthly';
  if (/^yr/i.test(lower) || lower === 'year' || lower === 'annually' || lower === 'annum') return 'yearly';
  return lower;
}

function normalizeCnCycle(raw: string): string {
  if (raw === '月') return 'monthly';
  if (raw === '年') return 'yearly';
  if (raw === '季') return 'quarterly';
  return raw;
}

/**
 * 从文本中提取所有价格
 */
function extractPrices(text: string): PriceEvidence[] {
  const prices: PriceEvidence[] = [];
  const seenRaw = new Set<string>();

  for (const { pattern, extract } of PRICE_PATTERNS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const partial = extract(match);
      if (partial && partial.amount && partial.amount > 0 && !seenRaw.has(match[0])) {
        seenRaw.add(match[0]);

        // 尝试从上下文提取计划名
        const context = text.substring(
          Math.max(0, match.index - 50),
          Math.min(text.length, match.index + match[0].length + 30)
        );
        const planName = extractPlanName(context);

        prices.push({
          plan: planName || 'Unknown',
          amount: partial.amount!,
          currency: partial.currency || 'USD',
          cycle: partial.cycle || 'unknown',
          raw: partial.raw || match[0],
        });
      }
    }
  }

  return prices;
}

/**
 * 从上下文中提取计划名称
 */
function extractPlanName(context: string): string | null {
  for (const pattern of PLAN_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(context);
    if (match) return match[1];
  }
  return null;
}

/**
 * 从 snippet 中提取有价值的事实陈述
 */
function extractFacts(text: string, title: string): string[] {
  const facts: string[] = [];
  const combinedText = `${title}. ${text}`;

  // 按句子拆分
  const sentences = combinedText
    .split(/[.。!！?？;；\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && s.length < 200);

  for (const sentence of sentences) {
    // 包含价格信息的句子
    if (/\$|\¥|USD|CNY|EUR|€|元|price|cost|pric|subscription|plan|fee/i.test(sentence)) {
      facts.push(sentence);
    }
    // 包含功能/特性描述
    else if (/feature|include|offer|provide|support|limit|unlimited|storage|member/i.test(sentence)) {
      facts.push(sentence);
    }
    // 包含对比信息
    else if (/vs|compared|better|cheaper|expensive|alternative|switch/i.test(sentence)) {
      facts.push(sentence);
    }
  }

  // 去重并限制数量
  const unique = [...new Set(facts)];
  return unique.slice(0, 5); // 每个来源最多 5 条事实
}

/**
 * 根据信源等级确定置信度
 */
function determineConfidence(tier: SourceTier, hasPrices: boolean): 'high' | 'medium' | 'low' {
  if (tier === 'S' && hasPrices) return 'high';
  if (tier === 'S' || (tier === 'A' && hasPrices)) return 'high';
  if (tier === 'A' || tier === 'B') return 'medium';
  return 'low';
}

// ============ 主函数 ============

/**
 * 从评分后的搜索结果中提取结构化证据
 * 
 * @param results 已评分排序的搜索结果
 * @returns 结构化证据
 */
export function extractEvidence(results: ScoredResult[]): ExtractionResult {
  const evidences: Evidence[] = [];
  const allPrices: PriceEvidence[] = [];

  for (const result of results) {
    const combinedText = `${result.title} ${result.snippet}`;
    const prices = extractPrices(combinedText);
    const facts = extractFacts(result.snippet, result.title);
    const confidence = determineConfidence(result.tier, prices.length > 0);

    if (facts.length > 0 || prices.length > 0) {
      evidences.push({
        source: result.source,
        sourceUrl: result.url,
        tier: result.tier,
        facts,
        prices,
        confidence,
      });

      allPrices.push(...prices);
    }
  }

  return {
    evidences,
    allPrices,
    factCount: evidences.reduce((sum, e) => sum + e.facts.length, 0),
  };
}

/**
 * 去重价格证据（相同金额+货币+周期视为重复）
 */
export function deduplicatePrices(prices: PriceEvidence[]): PriceEvidence[] {
  const seen = new Set<string>();
  return prices.filter(p => {
    const key = `${p.amount}-${p.currency}-${p.cycle}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
