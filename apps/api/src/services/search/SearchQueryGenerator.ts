/**
 * SearchQueryGenerator - 多查询生成器
 * 
 * 将用户的原始查询（可能是中文）转换为 2-3 个不同角度的英文查询，
 * 以提高搜索覆盖率和结果质量。
 */

export interface GeneratedQueries {
  queries: string[];
  originalQuery: string;
  detectedService: string;
  language: 'zh' | 'en' | 'mixed';
}

/**
 * 中英服务名映射表
 * 对于已知服务，直接使用标准英文名
 */
const SERVICE_NAME_MAP: Record<string, { en: string; officialDomain?: string }> = {
  // 视频流媒体
  '爱奇艺': { en: 'iQIYI', officialDomain: 'iqiyi.com' },
  '优酷': { en: 'Youku', officialDomain: 'youku.com' },
  '腾讯视频': { en: 'Tencent Video', officialDomain: 'v.qq.com' },
  '芒果tv': { en: 'Mango TV', officialDomain: 'mgtv.com' },
  '网飞': { en: 'Netflix', officialDomain: 'netflix.com' },
  '奈飞': { en: 'Netflix', officialDomain: 'netflix.com' },
  'b站': { en: 'Bilibili', officialDomain: 'bilibili.com' },
  '哔哩哔哩': { en: 'Bilibili', officialDomain: 'bilibili.com' },

  // 音乐
  '网易云音乐': { en: 'NetEase Cloud Music', officialDomain: 'music.163.com' },
  'qq音乐': { en: 'QQ Music', officialDomain: 'y.qq.com' },
  '酷狗音乐': { en: 'Kugou Music', officialDomain: 'kugou.com' },
  '酷我音乐': { en: 'Kuwo Music', officialDomain: 'kuwo.cn' },

  // 工具/开发
  'csdn': { en: 'CSDN', officialDomain: 'csdn.net' },
  '知乎': { en: 'Zhihu', officialDomain: 'zhihu.com' },
  '印象笔记': { en: 'Evernote', officialDomain: 'evernote.com' },
  '有道云笔记': { en: 'Youdao Note', officialDomain: 'note.youdao.com' },
  'wps': { en: 'WPS Office', officialDomain: 'wps.com' },
  '百度网盘': { en: 'Baidu Netdisk', officialDomain: 'pan.baidu.com' },
  '阿里云盘': { en: 'Aliyun Drive', officialDomain: 'alipan.com' },

  // 游戏
  '虎牙': { en: 'Huya', officialDomain: 'huya.com' },
  '斗鱼': { en: 'Douyu', officialDomain: 'douyu.com' },

  // 国际服务（中文别名）
  '苹果音乐': { en: 'Apple Music', officialDomain: 'music.apple.com' },
  '苹果电视': { en: 'Apple TV+', officialDomain: 'tv.apple.com' },
  '微软365': { en: 'Microsoft 365', officialDomain: 'microsoft.com' },
  '谷歌': { en: 'Google', officialDomain: 'google.com' },
};

/**
 * 中文通用词 → 英文映射
 */
const KEYWORD_MAP: Record<string, string> = {
  '价格': 'pricing',
  '收费': 'pricing',
  '多少钱': 'cost',
  '费用': 'cost',
  '会员': 'membership',
  '订阅': 'subscription',
  '套餐': 'plan',
  '月费': 'monthly price',
  '年费': 'yearly price',
  '月付': 'monthly',
  '年付': 'yearly annual',
  '连续包月': 'auto-renew monthly',
  'vip': 'VIP premium',
  '超级会员': 'super VIP premium',
  '大会员': 'premium membership',
  '黄金会员': 'gold membership',
  '铂金会员': 'platinum membership',
  '钻石会员': 'diamond membership',
  '尊享': 'premium exclusive',
  '免费': 'free tier',
  '试用': 'free trial',
  '优惠': 'discount promotion',
  '学生': 'student plan',
  '家庭': 'family plan',
  '个人': 'individual plan',
  '企业': 'business enterprise plan',
  '团队': 'team plan',
};

/**
 * 检测是否为中文文本
 */
function isChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * 从查询中提取服务名
 */
function extractServiceName(query: string): { name: string; officialDomain?: string } {
  const lowerQuery = query.toLowerCase().trim();

  // 1. 检查已知映射表
  for (const [cnName, info] of Object.entries(SERVICE_NAME_MAP)) {
    if (lowerQuery.includes(cnName.toLowerCase())) {
      return { name: info.en, officialDomain: info.officialDomain };
    }
  }

  // 2. 对于纯英文服务名，直接提取（去掉通用中文词）
  const withoutCnKeywords = query
    .replace(/[\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (withoutCnKeywords.length > 1) {
    return { name: withoutCnKeywords };
  }

  // 3. 保留原始查询
  return { name: query.trim() };
}

/**
 * 将中文查询翻译为英文
 */
function translateToEnglish(query: string): string {
  let result = query.toLowerCase();

  // 替换已知服务名
  for (const [cnName, info] of Object.entries(SERVICE_NAME_MAP)) {
    const regex = new RegExp(cnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, info.en);
  }

  // 替换通用关键词
  for (const [cn, en] of Object.entries(KEYWORD_MAP)) {
    const regex = new RegExp(cn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, en);
  }

  // 清理多余空格
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * 生成搜索查询
 * 
 * 策略：针对不同角度生成 2-3 个英文查询
 * - 官方定价查询
 * - 对比/评测查询  
 * - FAQ/Plan 查询
 */
export function generateSearchQueries(
  query: string,
  searchType: string = 'pricing'
): GeneratedQueries {
  const language = isChinese(query) ? 'zh' : 'en';
  const { name: serviceName, officialDomain } = extractServiceName(query);
  const year = new Date().getFullYear();

  const queries: string[] = [];

  switch (searchType) {
    case 'pricing': {
      // 角度 1：官方定价（最重要）
      if (officialDomain) {
        queries.push(`site:${officialDomain} ${serviceName} pricing plans ${year}`);
      } else {
        queries.push(`${serviceName} official pricing plans subscription ${year}`);
      }
      // 角度 2：评测/对比
      queries.push(`${serviceName} subscription price review how much cost ${year}`);
      // 角度 3：FAQ / plan breakdown
      queries.push(`${serviceName} membership plans features pricing comparison`);
      break;
    }

    case 'promotion': {
      queries.push(`${serviceName} discount coupon promotion deal ${year}`);
      queries.push(`${serviceName} student discount free trial offer`);
      break;
    }

    case 'alternative': {
      queries.push(`${serviceName} alternatives comparison best similar services`);
      queries.push(`${serviceName} vs competitors pricing features ${year}`);
      break;
    }

    default: {
      // General search
      const translated = language === 'zh' ? translateToEnglish(query) : query;
      queries.push(translated);
      if (serviceName !== translated) {
        queries.push(`${serviceName} subscription details ${year}`);
      }
      break;
    }
  }

  return {
    queries: queries.slice(0, 3), // 最多 3 个
    originalQuery: query,
    detectedService: serviceName,
    language: language === 'zh' ? 'zh' : 'en',
  };
}

/**
 * 获取服务的官方域名（如果已知）
 */
export function getOfficialDomain(serviceName: string): string | undefined {
  const lower = serviceName.toLowerCase();
  for (const [cnName, info] of Object.entries(SERVICE_NAME_MAP)) {
    if (lower.includes(cnName.toLowerCase()) || lower.includes(info.en.toLowerCase())) {
      return info.officialDomain;
    }
  }
  return undefined;
}
