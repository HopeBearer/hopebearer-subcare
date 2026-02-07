import { Message } from '@subcare/database';
import { LLMMessage } from '../../infrastructure/ai/interfaces/LLMProvider';

/**
 * 转换历史消息为 LLM 格式
 */
export function convertHistoryToLLMMessages(messages: Message[]): LLMMessage[] {
  return messages.map(msg => {
    const base: LLMMessage = {
      role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
      content: msg.content
    };

    if (msg.toolCallId) {
      base.tool_call_id = msg.toolCallId;
    }

    return base;
  });
}

/**
 * 判断消息是否依赖上下文（需要历史记录才能理解）
 */
export function isContextDependentMessage(content: string): boolean {
  const input = content.toLowerCase().trim();
  
  // 短句（小于 10 个字符）通常是回复/确认
  if (input.length < 10) {
    return true;
  }
  
  // 明确的确认/回复词
  const contextDependentPatterns = [
    // 中文确认
    /^(是|对|好|行|可以|没问题|确认|已|付了|支付了|已支付|付过|交了|已付|ok)/i,
    // 英文确认
    /^(yes|yeah|yep|ok|okay|sure|done|paid|confirmed|right)/i,
    // 否定回复
    /^(不|否|没|no|not|nope|cancel)/i
  ];
  
  return contextDependentPatterns.some(pattern => pattern.test(input));
}

/**
 * 判断是否为操作类跟进消息（即使不是短句）
 * 例如：修改价格/日期/周期/状态等
 */
export function isFollowUpMutationMessage(content: string): boolean {
  const input = content.toLowerCase().trim();
  const patterns = [
    // 中文
    /价格|费用|金额|改为|改成|修改|更新|调整|日期|时间|账单|付款|周期|月付|年付/,
    // 英文
    /price|amount|cost|change|update|modify|adjust|date|bill|payment|cycle|monthly|yearly/
  ];
  return patterns.some(pattern => pattern.test(input));
}

export function extractPendingBillContext(
  toolCalls?: Array<{ result?: any }>
): { defaultBillId?: string; bills?: Array<{ id: string; subscriptionName?: string; amount?: number; currency?: string; billingDate?: string }> } | null {
  if (!toolCalls || toolCalls.length === 0) return null;

  let defaultBillId: string | undefined;
  let bills: Array<{ id: string; subscriptionName?: string; amount?: number; currency?: string; billingDate?: string }> = [];

  for (const call of toolCalls) {
    const result = call?.result;
    if (!result) continue;

    if (result.pendingBill?.id) {
      defaultBillId = result.pendingBill.id;
      bills.push({
        id: result.pendingBill.id,
        amount: result.pendingBill.amount,
        currency: result.pendingBill.currency,
        billingDate: result.pendingBill.billingDate
      });
    }

    if (Array.isArray(result.bills)) {
      bills = bills.concat(
        result.bills.map((bill: any) => ({
          id: bill.id,
          subscriptionName: bill.subscriptionName,
          amount: bill.amount,
          currency: bill.currency,
          billingDate: bill.billingDate
        }))
      );
    }
  }

  if (bills.length === 0 && !defaultBillId) return null;
  return { defaultBillId, bills };
}

/**
 * 判断上一条助手消息是否暗示需要补充操作信息
 * 用于短回复场景下的意图兜底（仅限操作类）
 */
export function isLikelyMutationContext(lastAssistantContent: string): boolean {
  const input = lastAssistantContent.toLowerCase();
  const mutationHints = [
    // 中文提示
    '请告诉我', '需要您的帮助', '价格', '计费', '周期', '月付', '年付', '订阅',
    '添加', '更新', '修改', '取消', '确认支付', '已支付', '待支付', '账单',
    // 英文提示
    'please tell me', 'need your help', 'price', 'billing', 'cycle', 'monthly', 'yearly',
    'subscription', 'add', 'update', 'modify', 'cancel', 'confirm payment', 'paid', 'pending bill'
  ];

  return mutationHints.some(keyword => input.includes(keyword));
}

/**
 * 判断用户问题是否需要价格信息
 */
export function needsPricingInfo(content: string): boolean {
  const input = content.toLowerCase();
  const pricingKeywords = [
    // 中文
    '价格', '收费', '多少钱', '费用', '套餐', '订阅费', '月费', '年费',
    '怎么收', '贵不贵', '便宜',
    // 英文
    'price', 'pricing', 'cost', 'how much', 'fee', 'plan', 'subscription',
    'expensive', 'cheap', 'afford'
  ];
  return pricingKeywords.some(keyword => input.includes(keyword));
}

/**
 * 从用户输入中提取服务名称
 */
export function extractServiceName(content: string): string {
  const input = content.toLowerCase();
  
  // 常见订阅服务名称列表
  const knownServices = [
    'netflix', 'spotify', 'youtube', 'youtube premium', 'apple music', 'apple tv',
    'disney', 'disney+', 'hbo', 'hulu', 'amazon prime', 'prime video',
    'icloud', 'google one', 'dropbox', 'onedrive',
    'office 365', 'microsoft 365', 'adobe', 'creative cloud',
    'notion', 'figma', 'canva', 'github', 'gitlab',
    'openai', 'chatgpt', 'claude', 'midjourney',
    'bilibili', 'b站', '爱奇艺', '优酷', '腾讯视频', '芒果tv', '网飞', '奈飞',
    '虎牙', '斗鱼', 'twitch',
    'wps', '印象笔记', 'evernote', '有道云笔记',
    'steam', 'xbox', 'playstation', 'ps plus', 'nintendo', 'switch online'
  ];
  
  // 首先检查已知服务名
  for (const service of knownServices) {
    if (input.includes(service)) {
      return service;
    }
  }
  
  // 尝试从"XXX是什么"、"关于XXX"等模式提取
  const patterns = [
    /(.+?)是什么/,
    /(.+?)怎么收费/,
    /(.+?)多少钱/,
    /(.+?)价格/,
    /关于(.+)/,
    /what is (.+)/i,
    /about (.+)/i,
    /(.+?) pricing/i,
    /(.+?) subscription/i
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      // 过滤掉太短或太通用的结果
      if (extracted.length > 1 && !['它', '这个', '那个', 'it', 'this', 'that'].includes(extracted)) {
        return extracted;
      }
    }
  }
  
  return content.trim();
}
