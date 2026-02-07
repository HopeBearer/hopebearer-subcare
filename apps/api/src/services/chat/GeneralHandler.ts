/**
 * General Query Handler
 * 处理常规对话请求
 */

import { Message } from '@subcare/database';
import { MessageRepository } from '../../repositories/MessageRepository';
import { ConversationRepository } from '../../repositories/ConversationRepository';
import { ToolExecutor } from '../../infrastructure/ai/tools/ToolExecutor';
import { TOOL_DEFINITIONS } from '../../infrastructure/ai/tools/ToolDefinitions';
import { ToolCallGovernor } from '../../infrastructure/ai/tools/ToolCallGovernor';
import { LLMMessage } from '../../infrastructure/ai/interfaces/LLMProvider';
import { getChatSystemPrompt, CHAT_TOOL_NAMES } from '../prompts/chat-system-prompt';
import { detectLanguage } from '../intent';
import { QueryHandlerParams, ToolCallRecord, MAX_TOOL_CALLS } from './types';
import { convertHistoryToLLMMessages } from './utils';

export interface GeneralHandlerParams extends QueryHandlerParams {
  history: Message[];
}

export class GeneralHandler {
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
   * 处理常规查询
   */
  async handle(params: GeneralHandlerParams): Promise<Message> {
    const { conversationId, userId, content, history, provider, userCurrency, callbacks, onProgress } = params;

    console.log('[GeneralHandler] Handling general query');

    // 检测用户语言
    const detectedLanguage = detectLanguage(content);
    
    // 构建系统提示词
    const systemPrompt = getChatSystemPrompt(undefined, userCurrency || undefined, detectedLanguage);
    
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...convertHistoryToLLMMessages(history),
      { role: 'user', content }
    ];

    // 筛选对话工具
    const chatTools = TOOL_DEFINITIONS.filter(t => 
      CHAT_TOOL_NAMES.includes(t.function.name)
    );

    // 跟踪所有工具调用
    const allToolCalls: ToolCallRecord[] = [];
    const governor = new ToolCallGovernor(TOOL_DEFINITIONS, {
      maxTotalCalls: MAX_TOOL_CALLS,
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
      ? await provider.chatStream(messages, streamCallbacks, chatTools)
      : await provider.chat(messages, chatTools);
    
    let totalTokens = response.usage?.totalTokens || 0;
    let toolCallCount = 0;
    let assistantContent = response.content;

    // 工具调用循环
    while (response.finish_reason === 'tool_calls' && response.tool_calls && toolCallCount < MAX_TOOL_CALLS) {
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
        ? await provider.chatStream(messages, streamCallbacks, chatTools)
        : await provider.chat(messages, chatTools);
      
      totalTokens += response.usage?.totalTokens || 0;
      assistantContent += response.content;
    }

    // Check if spending summary was used and if it was for a non-this_month period
    const spendingSummaryCall = allToolCalls.find(call => call.name === 'get_spending_summary' && call.status === 'completed');
    if (spendingSummaryCall) {
      const resultData = spendingSummaryCall.result as any;
      // Only add clarification for non-this_month periods (which use monthly-equivalent)
      // For this_month, all data is already based on actual payment records — no clarification needed
      if (resultData?.period && resultData.period !== 'this_month') {
        const clarification =
          detectedLanguage === 'zh'
            ? '💡 说明：以上金额为月度等价金额（年付折合月费等），非当月实际支付记录。'
            : '💡 Note: The above amounts are monthly-equivalent (annual plans divided by 12, etc.), not actual payment records for the month.';
        if (!assistantContent.includes(clarification)) {
          assistantContent = `${assistantContent || ''}\n\n${clarification}`.trim();
        }
      }
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
