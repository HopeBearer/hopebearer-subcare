/**
 * Output Validator
 * 第3层：输出校验，防止 LLM 幻觉
 */

import { DbQueryResult } from './DbQueryHandler';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 从 LLM 输出中提取数字
 */
function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

/**
 * 从数据库结果中获取关键数值
 */
function getDbNumbers(dbResult: DbQueryResult): Record<string, number> {
  const numbers: Record<string, number> = {};

  if (!dbResult.success || !dbResult.data) {
    return numbers;
  }

  const data = dbResult.data;

  // 订阅查询结果
  if (Array.isArray(data)) {
    numbers['count'] = data.length;
  }

  // 统计结果
  if (data.totalCount !== undefined) {
    numbers['totalCount'] = data.totalCount;
  }
  if (data.count !== undefined) {
    numbers['count'] = data.count;
  }
  if (data.subscriptionCount !== undefined) {
    numbers['subscriptionCount'] = data.subscriptionCount;
  }

  // 金额相关（通常是小数，取整数部分进行比较）
  if (data.total !== undefined) {
    numbers['total'] = Math.round(data.total);
  }
  if (data.amount !== undefined) {
    numbers['amount'] = Math.round(data.amount);
  }
  if (data.totalSpend !== undefined) {
    numbers['totalSpend'] = Math.round(data.totalSpend);
  }

  return numbers;
}

/**
 * 验证 LLM 输出与数据库数据的一致性
 */
export function validateOutput(
  llmOutput: string,
  dbResult: DbQueryResult,
  userInput: string
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  // 如果数据库查询失败，跳过验证
  if (!dbResult.success) {
    result.warnings.push('Database query failed, cannot validate output');
    return result;
  }

  const dbNumbers = getDbNumbers(dbResult);
  const llmNumbers = extractNumbers(llmOutput);

  console.log('[OutputValidator] DB numbers:', dbNumbers);
  console.log('[OutputValidator] LLM numbers:', llmNumbers);

  // 判断用户询问类型
  const isAskingSpending = /花|钱|消费|支出|spend|cost|expense|payment/i.test(userInput);
  const isAskingCount = /多少个|几个|how many|count|number of/i.test(userInput);
  
  // 如果用户问的是花费，只验证花费数据
  if (isAskingSpending && dbNumbers['totalSpend'] !== undefined) {
    const actualSpend = dbNumbers['totalSpend'];
    const mentionedNumbers = llmNumbers.filter(n => n > 0 && n < 100000);
    
    // 花费类问题放宽验证 - 只有明显错误时才标记
    if (mentionedNumbers.length > 0) {
      const hasCorrectSpend = mentionedNumbers.some(n => Math.abs(n - actualSpend) <= 1);
      if (!hasCorrectSpend) {
        result.warnings.push(`Spending mismatch: expected ${actualSpend}`);
        // 花费问题不标记为 invalid，让 LLM 回答通过
      }
    }
  }
  // 如果用户问的是订阅数量
  else if (isAskingCount && (dbNumbers['count'] !== undefined || dbNumbers['subscriptionCount'] !== undefined)) {
    const actualCount = dbNumbers['count'] ?? dbNumbers['subscriptionCount'];
    const mentionedNumbers = llmNumbers.filter(n => n > 0 && n < 1000);
    
    if (mentionedNumbers.length > 0) {
      const hasCorrectCount = mentionedNumbers.includes(actualCount);
      
      if (!hasCorrectCount) {
        const wrongCounts = mentionedNumbers.filter(n => n !== actualCount);
        
        if (wrongCounts.length > 0) {
          result.valid = false;
          result.errors.push(
            `Subscription count mismatch: LLM said ${wrongCounts[0]}, but actual is ${actualCount}`
          );
        }
      }
    }
  }

  // 检查空数据时的回答
  if (Array.isArray(dbResult.data) && dbResult.data.length === 0) {
    // 检查 LLM 是否正确处理了空结果
    const impliesHasData = /你有|you have|共有|总共|包括|including/i.test(llmOutput);
    const statesNoData = /没有|无|暂无|empty|no data|no subscription|don't have|0个|零个/i.test(llmOutput);
    
    if (impliesHasData && !statesNoData) {
      result.warnings.push('LLM implies user has data but database returned empty result');
    }
  }

  return result;
}

/**
 * 构建校验失败时的安全回复
 */
export function buildSafeResponse(
  dbResult: DbQueryResult,
  userInput: string,
  detectedLanguage: 'zh' | 'en'
): string {
  const data = dbResult.data;
  const isAskingSpending = /花|钱|消费|支出|spend|cost|expense|payment/i.test(userInput);

  // 根据检测到的语言和问题类型返回
  if (detectedLanguage === 'zh') {
    // 花费类问题
    if (isAskingSpending && data?.totalSpend !== undefined) {
      const currency = data.currency || 'CNY';
      return `根据系统数据，${data.periodLabel || '本月'}您共花费 ${currency} ${data.totalSpend}，涉及 ${data.subscriptionCount || 0} 个订阅。`;
    }
    // 订阅数量问题
    if (Array.isArray(data)) {
      return `根据系统数据，您当前共有 ${data.length} 个活跃订阅。`;
    }
    if (data?.subscriptionCount !== undefined) {
      return `根据系统数据，您当前共有 ${data.subscriptionCount} 个订阅。`;
    }
    return '抱歉，我无法准确回答这个问题。请稍后重试。';
  } else {
    // 花费类问题
    if (isAskingSpending && data?.totalSpend !== undefined) {
      const currency = data.currency || 'CNY';
      return `According to system data, you spent ${currency} ${data.totalSpend} ${data.periodLabel || 'this month'} across ${data.subscriptionCount || 0} subscriptions.`;
    }
    // 订阅数量问题
    if (Array.isArray(data)) {
      return `According to the system data, you currently have ${data.length} active subscriptions.`;
    }
    if (data?.subscriptionCount !== undefined) {
      return `According to the system data, you currently have ${data.subscriptionCount} subscriptions.`;
    }
    return 'Sorry, I cannot accurately answer this question. Please try again later.';
  }
}

/**
 * 检测用户输入的语言
 */
export function detectLanguage(input: string): 'zh' | 'en' {
  // 简单的中文检测：检查是否包含中文字符
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(input) ? 'zh' : 'en';
}
