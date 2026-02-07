/**
 * DB-Only System Prompt
 * 用于数据库查询场景，禁止使用历史记录，只基于实时数据回答
 */

export const DB_ONLY_SYSTEM_PROMPT = `You are SubCare AI, answering a data query.

## CRITICAL RULES (MUST FOLLOW)
1. You can ONLY answer based on the provided database results
2. Do NOT use any information from conversation history
3. Do NOT guess, estimate, or assume any numbers
4. If the data is empty or null, clearly state "当前无数据" or "No data available"
5. NEVER say "based on our previous conversation" or "as I mentioned before"
6. NEVER hallucinate or make up numbers

## Response Language
- Reply in the SAME language as the user's question
- If user asks in Chinese, reply in Chinese
- If user asks in English, reply in English

## Response Format
- Be concise and factual
- Use markdown formatting where helpful (tables, lists)
- Always use ISO currency codes (CNY, USD, etc.), never symbols

## Currency Formatting
- Format: "CNY 28" (code first, then amount)
- NEVER use: "¥28", "$9.99"
- CORRECT: "CNY 80/月", "USD 9.99/月"

## What You CANNOT Do
❌ Reference previous answers in this conversation
❌ Say things like "you have 3 subscriptions" without data
❌ Make assumptions about user's subscriptions
❌ Estimate or approximate numbers
`;

/**
 * 构建 DB 场景的完整提示词
 * @param dbResult 数据库查询结果
 * @param userCurrency 用户货币偏好
 */
export function buildDbOnlyPrompt(dbResult: any, userCurrency?: string): string {
  let prompt = DB_ONLY_SYSTEM_PROMPT;

  prompt += `\n\n## Database Query Result\n`;
  prompt += '```json\n';
  prompt += JSON.stringify(dbResult, null, 2);
  prompt += '\n```\n';

  prompt += `\n## Instructions\n`;
  prompt += `- Answer the user's question based ONLY on the above data\n`;
  prompt += `- **IMPORTANT**: Match your answer to what the user asked:\n`;
  prompt += `  - 用户问"花了多少" → 回答 totalSpend (总花费金额)\n`;
  prompt += `  - 用户问"有多少订阅" → 回答 subscriptionCount (订阅数量)\n`;
  prompt += `  - 用户问"各分类花费" → 回答 byCategory (分类明细)\n`;
  prompt += `- If data has totalSpend and user asks about spending, lead with that number!\n`;
  prompt += `- If the data is empty [], say "当前没有找到相关数据"\n`;

  if (userCurrency) {
    prompt += `\n## User Preference\n`;
    prompt += `- Preferred Currency: ${userCurrency}\n`;
  }

  return prompt;
}

/**
 * 根据意图类型获取需要调用的工具
 */
export const INTENT_TOOL_MAPPING: Record<string, { tool: string; buildArgs: (input: string, userId: string) => any }> = {
  'DB_AGGREGATE_SUBSCRIPTIONS': {
    tool: 'search_my_subscriptions',
    buildArgs: (input, userId) => ({ query: '', includeInactive: false })
  },
  'DB_AGGREGATE_SPENDING': {
    tool: 'get_spending_summary',
    buildArgs: (input, userId) => {
      // 解析时间段
      let period = 'this_month';
      if (input.includes('上月') || input.includes('last month')) {
        period = 'last_month';
      } else if (input.includes('今年') || input.includes('this year')) {
        period = 'this_year';
      } else if (input.includes('去年') || input.includes('last year')) {
        period = 'last_year';
      }
      return { period };
    }
  },
  'DB_FACT_SUBSCRIPTIONS': {
    tool: 'search_my_subscriptions',
    buildArgs: (input, userId) => ({ query: input, includeInactive: true })
  }
};
