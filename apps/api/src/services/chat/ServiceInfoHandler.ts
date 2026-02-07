/**
 * Service Info Handler
 * 处理 SERVICE_INFO 类型的请求（查询订阅服务信息）
 */

import { Message } from '@subcare/database';
import { MessageRepository } from '../../repositories/MessageRepository';
import { ConversationRepository } from '../../repositories/ConversationRepository';
import { ToolExecutor } from '../../infrastructure/ai/tools/ToolExecutor';
import { TOOL_DEFINITIONS } from '../../infrastructure/ai/tools/ToolDefinitions';
import { ToolCallGovernor } from '../../infrastructure/ai/tools/ToolCallGovernor';
import { LLMMessage } from '../../infrastructure/ai/interfaces/LLMProvider';
import { buildServiceInfoPrompt } from '../prompts/service-info-prompt';
import { detectLanguage } from '../intent';
import { QueryHandlerParams, ToolCallRecord } from './types';
import { extractServiceName, needsPricingInfo } from './utils';

export class ServiceInfoHandler {
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
   * 处理服务信息查询
   */
  async handle(params: QueryHandlerParams): Promise<Message> {
    const { conversationId, userId, content, provider, userCurrency, callbacks, onProgress } = params;

    console.log('[ServiceInfoHandler] Handling service info query');

    // 检测用户语言
    const detectedLanguage = detectLanguage(content);

    // 提取服务名称
    const serviceName = extractServiceName(content);
    console.log('[ServiceInfoHandler] Extracted service name:', serviceName);

    const allToolCalls: ToolCallRecord[] = [];
    const governor = new ToolCallGovernor(TOOL_DEFINITIONS, {
      maxTotalCalls: 2,
      maxPerToolCalls: { search_web: 1 }
    });

    // Step 1: 强制调用 lookup_subscription_service
    let lookupResult: any = null;
    if (serviceName) {
      const lookupStartTime = Date.now();
      onProgress?.({
        conversationId,
        type: 'tool_call',
        data: { toolName: 'lookup_subscription_service', status: 'started' }
      });

      try {
        const guard = governor.guard('lookup_subscription_service', { query: serviceName });
        if (!guard.allowed) {
          lookupResult = { error: guard.reason, details: guard.errors };
        } else {
          lookupResult = await this.toolExecutor.execute('lookup_subscription_service', guard.normalizedArgs, { userId });
          governor.recordCall('lookup_subscription_service');
        }
        const lookupDuration = Date.now() - lookupStartTime;
        allToolCalls.push({
          name: 'lookup_subscription_service',
          arguments: JSON.stringify({ query: serviceName }),
          result: lookupResult,
          status: 'completed',
          duration: lookupDuration
        });

        onProgress?.({
          conversationId,
          type: 'tool_call',
          data: { toolName: 'lookup_subscription_service', status: 'completed', result: lookupResult, duration: lookupDuration }
        });
      } catch (error: any) {
        const lookupDuration = Date.now() - lookupStartTime;
        allToolCalls.push({
          name: 'lookup_subscription_service',
          arguments: JSON.stringify({ query: serviceName }),
          result: { error: error.message },
          status: 'failed',
          duration: lookupDuration
        });
      }
    }

    // Step 2: 判断是否需要调用 search_web
    let webSearchResult: any = null;
    const lookupFound = lookupResult?.found && lookupResult?.matches?.length > 0;
    const needsWebSearch = !lookupFound || needsPricingInfo(content);
    
    if (needsWebSearch && serviceName) {
      const searchStartTime = Date.now();
      onProgress?.({
        conversationId,
        type: 'tool_call',
        data: { toolName: 'search_web', status: 'started' }
      });

      try {
        const searchQuery = needsPricingInfo(content)
          ? `${serviceName} subscription pricing 2026 official`
          : `${serviceName} subscription official`;

        const guard = governor.guard('search_web', {
          query: searchQuery,
          search_type: 'pricing',
          max_results: 3
        });
        
        if (!guard.allowed) {
          webSearchResult = { error: guard.reason, details: guard.errors };
        } else {
          webSearchResult = await this.toolExecutor.execute('search_web', guard.normalizedArgs, { userId });
          governor.recordCall('search_web');
        }
        const searchDuration = Date.now() - searchStartTime;
        
        allToolCalls.push({
          name: 'search_web',
          arguments: JSON.stringify({ query: searchQuery }),
          result: webSearchResult,
          status: 'completed',
          duration: searchDuration
        });

        onProgress?.({
          conversationId,
          type: 'tool_call',
          data: { toolName: 'search_web', status: 'completed', result: webSearchResult, duration: searchDuration }
        });
      } catch (error: any) {
        const searchDuration = Date.now() - searchStartTime;
        allToolCalls.push({
          name: 'search_web',
          arguments: JSON.stringify({ query: serviceName }),
          result: { error: error.message },
          status: 'failed',
          duration: searchDuration
        });
      }
    }

    // Step 3: 构建提示词
    const serviceInfoPrompt = buildServiceInfoPrompt(
      serviceName,
      lookupResult,
      webSearchResult,
      userCurrency,
      detectedLanguage
    );

    const messages: LLMMessage[] = [
      { role: 'system', content: serviceInfoPrompt },
      { role: 'user', content }
    ];

    // 流式回调
    const streamCallbacks = {
      onChunk: (chunk: string) => {
        callbacks?.onChunk?.(chunk);
        onProgress?.({
          conversationId,
          type: 'chunk',
          data: { chunk }
        });
      }
    };

    // 调用 LLM
    const response = provider.chatStream 
      ? await provider.chatStream(messages, streamCallbacks)
      : await provider.chat(messages);

    const assistantContent = response.content || '';
    const totalTokens = response.usage?.totalTokens || 0;

    // 保存助手回复
    const assistantMessage = await this.messageRepo.create({
      conversationId,
      role: 'assistant',
      content: assistantContent,
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
