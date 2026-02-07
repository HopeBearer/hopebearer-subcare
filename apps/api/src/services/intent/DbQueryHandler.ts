/**
 * DB Query Handler
 * 处理需要数据库查询的意图 - 第2层：强制工具调用
 */

import { ToolExecutor } from '../../infrastructure/ai/tools/ToolExecutor';
import { TOOL_DEFINITIONS } from '../../infrastructure/ai/tools/ToolDefinitions';
import { ToolCallGovernor } from '../../infrastructure/ai/tools/ToolCallGovernor';
import { QueryIntent } from './IntentClassifier';

export interface DbQueryResult {
  tool: string;
  success: boolean;
  data: any;
  error?: string;
}

/**
 * 根据意图类型和用户输入确定需要调用的工具
 */
export function determineRequiredTool(intent: QueryIntent, userInput: string): string {
  const input = userInput.toLowerCase();

  // DB_AGGREGATE: 统计类查询
  if (intent === QueryIntent.DB_AGGREGATE) {
    // 分类相关 - 必须优先判断
    if (
      input.includes('分类') || 
      input.includes('类别') || 
      input.includes('类型') ||
      input.includes('种类') ||
      input.includes('category') || 
      input.includes('categories') || 
      input.includes('type') ||
      input.includes('kind')
    ) {
      return 'list_categories';
    }
    // 花费/支出相关
    if (
      input.includes('花') || 
      input.includes('支出') || 
      input.includes('消费') || 
      input.includes('费用') ||
      input.includes('spend') || 
      input.includes('cost') || 
      input.includes('expense') ||
      input.includes('payment')
    ) {
      return 'get_spending_summary';
    }
    // 默认查订阅数量
    return 'search_my_subscriptions';
  }

  // DB_FACT: 事实性查询
  if (intent === QueryIntent.DB_FACT) {
    // 续费/过期时间
    if (
      input.includes('续费') || 
      input.includes('过期') || 
      input.includes('到期') ||
      input.includes('renew') || 
      input.includes('expire')
    ) {
      return 'search_my_subscriptions';
    }
    return 'search_my_subscriptions';
  }

  // DB_MUTATION: 操作类
  if (intent === QueryIntent.DB_MUTATION) {
    if (
      input.includes('添加') || 
      input.includes('新增') || 
      input.includes('订阅') ||
      input.includes('add') || 
      input.includes('subscribe')
    ) {
      return 'quick_add_subscription';
    }
    if (
      input.includes('取消') || 
      input.includes('删除') ||
      input.includes('cancel') || 
      input.includes('delete')
    ) {
      return 'cancel_subscription';
    }
    return 'search_my_subscriptions';
  }

  return 'search_my_subscriptions';
}

/**
 * 构建工具调用参数
 */
export function buildToolArgs(
  tool: string, 
  userInput: string, 
  _userId: string
): Record<string, any> {
  const input = userInput.toLowerCase();

  switch (tool) {
    case 'search_my_subscriptions':
      return { 
        query: userInput || '所有订阅'
      };

    case 'get_spending_summary': {
      // 解析时间段
      let period = 'this_month';
      if (input.includes('上月') || input.includes('上个月') || input.includes('last month')) {
        period = 'last_month';
      } else if (input.includes('今年') || input.includes('this year')) {
        period = 'this_year';
      } else if (input.includes('去年') || input.includes('last year')) {
        period = 'last_year';
      } else if (input.includes('本周') || input.includes('this week')) {
        period = 'this_week';
      }
      return { period };
    }

    case 'list_categories':
      // 分类查询，默认包含统计信息
      return { includeStats: true };

    default:
      return {};
  }
}

/**
 * DB Query Handler 类
 */
export class DbQueryHandler {
  private toolExecutor: ToolExecutor;

  constructor(toolExecutor: ToolExecutor) {
    this.toolExecutor = toolExecutor;
  }

  /**
   * 执行数据库查询
   */
  async executeQuery(
    intent: QueryIntent,
    userInput: string,
    userId: string
  ): Promise<DbQueryResult> {
    const tool = determineRequiredTool(intent, userInput);
    const args = buildToolArgs(tool, userInput, userId);
    const governor = new ToolCallGovernor(TOOL_DEFINITIONS, { maxTotalCalls: 1 });

    console.log('[DbQueryHandler] Executing tool:', tool, 'with args:', args);

    try {
      const guard = governor.guard(tool, args);
      if (!guard.allowed) {
        return {
          tool,
          success: false,
          data: null,
          error: guard.reason || 'INVALID_TOOL_ARGS'
        };
      }

      const result = await this.toolExecutor.execute(tool, guard.normalizedArgs, { userId });
      governor.recordCall(tool);
      
      console.log('[DbQueryHandler] Tool result:', JSON.stringify(result).substring(0, 200));

      return {
        tool,
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('[DbQueryHandler] Tool execution failed:', error);
      return {
        tool,
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * 执行多个查询（用于复杂问题）
   */
  async executeMultipleQueries(
    tools: string[],
    userInput: string,
    userId: string
  ): Promise<DbQueryResult[]> {
    const results: DbQueryResult[] = [];
    const governor = new ToolCallGovernor(TOOL_DEFINITIONS, { maxTotalCalls: tools.length });

    for (const tool of tools) {
      const args = buildToolArgs(tool, userInput, userId);
      
      try {
        const guard = governor.guard(tool, args);
        if (!guard.allowed) {
          results.push({
            tool,
            success: false,
            data: null,
            error: guard.reason || 'INVALID_TOOL_ARGS'
          });
          continue;
        }

        const result = await this.toolExecutor.execute(tool, guard.normalizedArgs, { userId });
        governor.recordCall(tool);
        results.push({
          tool,
          success: true,
          data: result
        });
      } catch (error: any) {
        results.push({
          tool,
          success: false,
          data: null,
          error: error.message
        });
      }
    }

    return results;
  }
}
