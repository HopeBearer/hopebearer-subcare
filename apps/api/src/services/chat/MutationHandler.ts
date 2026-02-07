/**
 * Mutation Query Handler
 * 处理 DB_MUTATION 类型的请求（添加/修改/删除订阅等）
 */

import { Message } from '@subcare/database';
import { MessageRepository } from '../../repositories/MessageRepository';
import { ConversationRepository } from '../../repositories/ConversationRepository';
import { ToolExecutor } from '../../infrastructure/ai/tools/ToolExecutor';
import { TOOL_DEFINITIONS } from '../../infrastructure/ai/tools/ToolDefinitions';
import { ToolCallGovernor } from '../../infrastructure/ai/tools/ToolCallGovernor';
import { LLMMessage } from '../../infrastructure/ai/interfaces/LLMProvider';
import { buildMutationPrompt } from '../prompts/mutation-prompt';
import { detectLanguage } from '../intent';
import { 
  QueryHandlerParams, 
  ToolCallRecord
} from './types';
import { convertHistoryToLLMMessages, extractPendingBillContext, isContextDependentMessage, isFollowUpMutationMessage } from './utils';

// 操作相关的工具列表
const MUTATION_TOOL_NAMES = [
  'lookup_subscription_service',
  'quick_add_subscription',
  'search_my_subscriptions',
  'update_subscription',
  'cancel_subscription',
  'pause_subscription',
  'resume_subscription',
  'search_web',
  'get_pending_bills',
  'confirm_bill_payment',
  'cancel_bill_payment',
  'cancel_all_pending_bills',
  'update_bill'
];

export class MutationHandler {
  private messageRepo: MessageRepository;
  private conversationRepo: ConversationRepository;
  private toolExecutor: ToolExecutor;

  constructor(
    messageRepo: MessageRepository,
    conversationRepo: ConversationRepository,
    toolExecutor: ToolExecutor
  ) {
    this.messageRepo = messageRepo;
    this.conversationRepo = conversationRepo;
    this.toolExecutor = toolExecutor;
  }

  /**
   * 处理操作类请求
   */
  async handle(params: QueryHandlerParams): Promise<Message> {
    const { conversationId, userId, content, provider, userCurrency, callbacks, onProgress } = params;

    // 检测用户语言
    const detectedLanguage = detectLanguage(content);
    
    // 构建操作专用提示词
    const mutationPrompt = buildMutationPrompt(userCurrency || undefined, detectedLanguage);
    
    // 判断是否需要上下文
    const needsContext = isContextDependentMessage(content) || isFollowUpMutationMessage(content);
    console.log(`[MutationHandler] Handling mutation query (needsContext: ${needsContext})`);
    
    const messages: LLMMessage[] = [
      { role: 'system', content: mutationPrompt }
    ];
    
    // 如果需要上下文，获取最近的对话消息
    if (needsContext) {
      const recentMessages = await this.messageRepo.findByConversationId(conversationId, {
        limit: 10
      });

      const ordered = [...recentMessages.items].reverse();
      const trimmed = ordered.filter((msg, index) => {
        if (index !== ordered.length - 1) return true;
        return !(msg.role === 'user' && msg.content === content);
      });
      const maxContextMessages = 12;
      const contextMessages = trimmed.slice(-maxContextMessages);
      const earlierMessages = trimmed.slice(0, Math.max(0, trimmed.length - maxContextMessages));

      if (earlierMessages.length > 0) {
        const summaryLines = earlierMessages.map((msg) => {
          const compact = (msg.content || '').replace(/\s+/g, ' ').slice(0, 80);
          return `${msg.role}: ${compact}${msg.content && msg.content.length > 80 ? '…' : ''}`;
        });
        messages.push({
          role: 'system',
          content: `Summary of earlier context:\n${summaryLines.join('\n')}`
        });
      }

      if (contextMessages.length > 0) {
        messages.push(...convertHistoryToLLMMessages(contextMessages));
        console.log(`[MutationHandler] Added recent messages as context`);
      }

      // 找到最后一条助手消息（用于 pending bill 上下文）
      const lastAssistantMsg = contextMessages
        .slice()
        .reverse()
        .find((msg: { role: string }) => msg.role === 'assistant');

      if (lastAssistantMsg) {
        const pendingBillContext = extractPendingBillContext((lastAssistantMsg as any).toolCalls);
        if (pendingBillContext) {
          messages.push({
            role: 'system',
            content: `Pending bill context (for follow-up operations only): ${JSON.stringify(pendingBillContext)}`
          });
        }
      }
    }
    
    // 添加当前用户消息
    messages.push({ role: 'user', content });

    // 筛选操作相关工具
    const mutationTools = TOOL_DEFINITIONS.filter(t => 
      MUTATION_TOOL_NAMES.includes(t.function.name)
    );

    // 跟踪所有工具调用
    const allToolCalls: ToolCallRecord[] = [];
    const governor = new ToolCallGovernor(TOOL_DEFINITIONS, {
      maxTotalCalls: 10,
      maxPerToolCalls: { search_web: 2 }
    });

    // 流式回调
    const streamCallbacks = {
      onChunk: (chunk: string) => {
        callbacks?.onChunk?.(chunk);
        onProgress?.({
          conversationId,
          type: 'chunk',
          data: { chunk }
        });
      },
      onToolCall: (toolCall: any, status: 'started' | 'completed') => {
        const toolName = toolCall.function.name;
        callbacks?.onToolCall?.(toolName, status);
        onProgress?.({
          conversationId,
          type: 'tool_call',
          data: { toolName, status }
        });
      }
    };

    // AI 对话循环
    let response = provider.chatStream 
      ? await provider.chatStream(messages, streamCallbacks, mutationTools)
      : await provider.chat(messages, mutationTools);
    
    let totalTokens = response.usage?.totalTokens || 0;
    let toolCallCount = 0;
    let assistantContent = response.content;

    // 工具调用循环
    while (response.finish_reason === 'tool_calls' && response.tool_calls && toolCallCount < 10) {
      const toolCalls = response.tool_calls;
      
      messages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: toolCalls
      });

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const startTime = Date.now();
        
        if (!provider.chatStream) {
          callbacks?.onToolCall?.(toolName, 'started');
          onProgress?.({
            conversationId,
            type: 'tool_call',
            data: { toolName, status: 'started' }
          });
        }

        try {
          const parsedArgs = JSON.parse(toolCall.function.arguments);
          const guard = governor.guard(toolName, parsedArgs);
          const duration = Date.now() - startTime;

          if (!guard.allowed) {
            const errorResult = { error: guard.reason, details: guard.errors };
            allToolCalls.push({
              name: toolName,
              arguments: toolCall.function.arguments,
              result: errorResult,
              status: 'failed',
              duration
            });

            messages.push({
              role: 'tool',
              content: JSON.stringify(errorResult),
              tool_call_id: toolCall.id
            });

            callbacks?.onToolCall?.(toolName, 'completed');
            onProgress?.({
              conversationId,
              type: 'tool_call',
              data: { toolName, status: 'failed', result: errorResult, duration }
            });

            toolCallCount++;
            continue;
          }

          const result = await this.toolExecutor.execute(toolName, guard.normalizedArgs, { userId });
          governor.recordCall(toolName);

          allToolCalls.push({
            name: toolName,
            arguments: toolCall.function.arguments,
            result,
            status: 'completed',
            duration
          });

          messages.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCall.id
          });

          callbacks?.onToolCall?.(toolName, 'completed');
          onProgress?.({
            conversationId,
            type: 'tool_call',
            data: { toolName, status: 'completed', result, duration }
          });
        } catch (error: any) {
          const duration = Date.now() - startTime;
          allToolCalls.push({
            name: toolName,
            arguments: toolCall.function.arguments,
            result: { error: error.message },
            status: 'failed',
            duration
          });

          messages.push({
            role: 'tool',
            content: JSON.stringify({ error: error.message }),
            tool_call_id: toolCall.id
          });
        }

        toolCallCount++;
      }

      response = provider.chatStream 
        ? await provider.chatStream(messages, streamCallbacks, mutationTools)
        : await provider.chat(messages, mutationTools);
      
      totalTokens += response.usage?.totalTokens || 0;
      assistantContent += response.content;
    }

    // 保存助手回复
    const assistantMessage = await this.messageRepo.create({
      conversationId,
      role: 'assistant',
      content: assistantContent || '',
      tokenCount: totalTokens,
      toolCalls: allToolCalls.length > 0 ? allToolCalls as any : undefined
    });

    await this.conversationRepo.update(conversationId, {});

    callbacks?.onComplete?.(assistantMessage);
    onProgress?.({
      conversationId,
      type: 'complete',
      data: { message: assistantMessage }
    });

    return assistantMessage;
  }
}
