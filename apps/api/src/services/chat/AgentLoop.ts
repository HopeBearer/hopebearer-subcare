/**
 * AgentLoop - 统一的 ReAct (Reasoning + Acting) 循环
 * 
 * 替代旧架构中的 4 个独立 Handler：
 * - GeneralHandler
 * - MutationHandler
 * - ServiceInfoHandler
 * - DbQueryHandler (+ IntentClassifier 路由)
 * 
 * 核心思路：
 * 所有消息走同一个循环，由 LLM 自主决定：
 * 1. 是否需要调用工具
 * 2. 调用哪个工具
 * 3. 传什么参数
 * 4. 是否需要继续调用更多工具
 * 5. 何时生成最终回答
 */

import { Message } from '@subcare/database';
import { MessageRepository } from '../../repositories/MessageRepository';
import { ConversationRepository } from '../../repositories/ConversationRepository';
import { ToolExecutor } from '../../infrastructure/ai/tools/ToolExecutor';
import { TOOL_DEFINITIONS } from '../../infrastructure/ai/tools/ToolDefinitions';
import { ToolCallGovernor } from '../../infrastructure/ai/tools/ToolCallGovernor';
import { LLMMessage, LLMProvider, LLMResponse } from '../../infrastructure/ai/interfaces/LLMProvider';
import { buildSystemPrompt } from './PromptBuilder';
import { ChatStreamCallbacks, ChatProgressCallback, ToolCallRecord, MAX_TOOL_CALLS } from './types';
import { convertHistoryToLLMMessages } from './utils';

/** LLM 调用超时时间（毫秒） */
const LLM_CALL_TIMEOUT = 90_000; // 90 秒

export interface AgentLoopParams {
  conversationId: string;
  userId: string;
  content: string;
  history: Message[];
  provider: LLMProvider;
  userCurrency?: string | null;
  userName?: string;
  callbacks?: ChatStreamCallbacks;
  onProgress?: ChatProgressCallback;
}

export class AgentLoop {
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
   * 变更操作工具名称集合
   */
  private static readonly MUTATION_TOOL_NAMES = new Set([
    'quick_add_subscription', 'update_subscription', 'cancel_subscription',
    'pause_subscription', 'resume_subscription',
    'confirm_bill_payment', 'cancel_bill_payment', 'cancel_all_pending_bills', 'update_bill'
  ]);

  /**
   * 用于检测是否为"建议性"而非"完成性"声明
   * 包含这些词的句子不算幻觉（如 "可以帮你添加订阅"）
   */
  private static readonly SUGGESTION_PREFIXES = /(?:可以|帮你|需要|是否|如果|建议|要不要|是否需要)/;

  private static readonly MUTATION_CLAIM_PATTERNS: Array<{ pattern: RegExp; requiredTools: string[]; label: string }> = [
    // ===== ✅ 开头的完成声明（高置信度）=====
    // "✅ 已确认支付" 或 "✅ XXX 账单支付已确认"
    { pattern: /✅[^。！？\n]{0,40}(?:确认[^。！？\n]{0,6}支付|支付[^。！？\n]{0,6}确认|已付款|已支付)/i, requiredTools: ['confirm_bill_payment'], label: '确认支付' },
    // "✅ 已添加XXX订阅"
    { pattern: /✅[^。！？\n]{0,40}(?:添加|创建|新增)[^。！？\n]{0,15}订阅/i, requiredTools: ['quick_add_subscription'], label: '添加订阅' },
    // "✅ XXX 分类已更新" 或 "✅ 已更新XXX"
    { pattern: /✅[^。！？\n]{0,40}(?:更新|修改|变更)[^。！？\n]{0,15}(?:订阅|价格|分类|周期)/i, requiredTools: ['update_subscription', 'update_bill'], label: '更新订阅/账单' },
    { pattern: /✅[^。！？\n]{0,40}(?:分类|价格|周期)[^。！？\n]{0,10}(?:已更新|已修改|已变更)/i, requiredTools: ['update_subscription', 'update_bill'], label: '更新订阅/账单' },
    // "✅ 已取消XXX订阅"
    { pattern: /✅[^。！？\n]{0,40}(?:取消|删除)[^。！？\n]{0,15}订阅/i, requiredTools: ['cancel_subscription'], label: '取消订阅' },
    // "✅ 已暂停/恢复XXX订阅"
    { pattern: /✅[^。！？\n]{0,40}(?:暂停)[^。！？\n]{0,15}订阅/i, requiredTools: ['pause_subscription'], label: '暂停订阅' },
    { pattern: /✅[^。！？\n]{0,40}(?:恢复|继续)[^。！？\n]{0,15}订阅/i, requiredTools: ['resume_subscription'], label: '恢复订阅' },
    // "✅ 已取消账单/待支付"
    { pattern: /✅[^。！？\n]{0,40}(?:取消)[^。！？\n]{0,15}(?:账单|待支付)/i, requiredTools: ['cancel_bill_payment', 'cancel_all_pending_bills'], label: '取消账单' },

    // ===== 非 ✅ 开头，但明确的完成性声明 =====
    // "已确认支付" 或 "支付已确认" (紧凑格式，不跨句)
    { pattern: /已(?:成功)?确认[^。！？\n]{0,6}(?:支付|付款)/i, requiredTools: ['confirm_bill_payment'], label: '确认支付' },
    { pattern: /(?:支付|付款|账单)[^。！？\n]{0,6}已(?:成功)?确认/i, requiredTools: ['confirm_bill_payment'], label: '确认支付' },
    // "已添加XXX订阅"
    { pattern: /已(?:成功)?(?:添加|创建|新增)[^。！？\n]{0,15}订阅/i, requiredTools: ['quick_add_subscription'], label: '添加订阅' },
    // "已更新XXX"
    { pattern: /已(?:成功)?(?:更新|修改|变更)[^。！？\n]{0,15}(?:订阅|价格|分类|周期)/i, requiredTools: ['update_subscription', 'update_bill'], label: '更新订阅/账单' },
  ];

  /**
   * 检测 LLM 是否在没有调用变更工具的情况下声称执行了变更操作（幻觉检测）
   * 
   * 策略：
   * 1. 按句子粒度检测，避免跨句误匹配
   * 2. 排除建议性短语（"可以帮你添加"、"需要确认"等）
   * 3. 只检查实际声称完成的操作
   */
  private detectHallucinatedMutation(
    content: string,
    toolCalls: ToolCallRecord[]
  ): { detected: boolean; claimedActions: string[] } {
    if (!content || content.trim().length === 0) {
      return { detected: false, claimedActions: [] };
    }

    // 收集实际成功调用的变更工具名
    const calledMutationTools = new Set(
      toolCalls
        .filter(tc => AgentLoop.MUTATION_TOOL_NAMES.has(tc.name) && tc.status === 'completed')
        .map(tc => tc.name)
    );

    // 按句子拆分（中文句号、感叹号、问号、换行），逐句检测
    const sentences = content.split(/[。！？\n]+/).filter(s => s.trim().length > 0);
    const claimedActions: string[] = [];
    const seenLabels = new Set<string>();

    for (const sentence of sentences) {
      // 跳过建议性句子（"可以帮你..."、"需要确认..."等）
      if (AgentLoop.SUGGESTION_PREFIXES.test(sentence)) {
        continue;
      }

      for (const { pattern, requiredTools, label } of AgentLoop.MUTATION_CLAIM_PATTERNS) {
        if (seenLabels.has(label)) continue; // 同类型只报告一次
        if (pattern.test(sentence)) {
          const hasRequiredTool = requiredTools.some(tool => calledMutationTools.has(tool));
          if (!hasRequiredTool) {
            claimedActions.push(label);
            seenLabels.add(label);
          }
        }
      }
    }

    return {
      detected: claimedActions.length > 0,
      claimedActions
    };
  }

  /**
   * 带超时的 LLM 调用包装
   */
  private callLLMWithTimeout(
    provider: LLMProvider,
    messages: LLMMessage[],
    streamCallbacks: any,
    tools: any[]
  ): Promise<LLMResponse> {
    const llmCall = provider.chatStream
      ? provider.chatStream(messages, streamCallbacks, tools)
      : provider.chat(messages, tools);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('LLM call timed out after ' + (LLM_CALL_TIMEOUT / 1000) + 's')), LLM_CALL_TIMEOUT)
    );

    return Promise.race([llmCall, timeout]);
  }

  /**
   * 执行 ReAct 循环
   * 
   * 流程：
   * 1. 构建 system prompt + history + user message
   * 2. 发送给 LLM（带上所有工具定义）
   * 3. 如果 LLM 返回 tool_calls → 执行工具 → 将结果追加到 messages → 重复步骤 2
   * 4. 如果 LLM 返回纯文本 → 结束循环，保存并返回
   */
  async run(params: AgentLoopParams): Promise<Message> {
    const {
      conversationId, userId, content, history,
      provider, userCurrency, userName,
      callbacks, onProgress
    } = params;

    console.log(`[AgentLoop] Starting run for conversation: ${conversationId}`);

    // ========== 1. 构建消息序列 ==========
    const systemPrompt = buildSystemPrompt({
      userCurrency: userCurrency || undefined,
      userName
    });

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...convertHistoryToLLMMessages(history),
      { role: 'user', content }
    ];

    console.log(`[AgentLoop] Messages: ${messages.length} (system + ${history.length} history + user)`);

    // ========== 2. 准备工具和治理器 ==========
    const allTools = TOOL_DEFINITIONS;
    const governor = new ToolCallGovernor(TOOL_DEFINITIONS, {
      maxTotalCalls: MAX_TOOL_CALLS,
      maxPerToolCalls: { search_web: 3 }
    });

    const allToolCalls: ToolCallRecord[] = [];
    const allThinkingSteps: string[] = []; // 累积思考步骤（持久化到数据库）
    let totalTokens = 0;
    let assistantContent = ''; // 仅存储 LLM 的实际输出，不混入思考痕迹
    let iteration = 0;
    let toolCallCount = 0;

    // ========== 3. 流式回调（透传到 WebSocket） ==========
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
        const toolName = toolCall.function?.name || 'unknown';
        callbacks?.onToolCall?.(toolName, status);
        onProgress?.({
          conversationId,
          type: 'tool_call',
          data: { toolName, status }
        });
      }
    };

    // ========== 4. ReAct 主循环 ==========
    try {
      while (iteration < MAX_TOOL_CALLS) {
        iteration++;
        console.log(`[AgentLoop] Iteration ${iteration}: calling LLM...`);

        // 发送思考事件（通过 thinking 事件通道，不混入 chunk 流）
        if (iteration === 1) {
          const thinkingSummary = '正在思考如何回应...';
          allThinkingSteps.push(thinkingSummary);
          onProgress?.({
            conversationId,
            type: 'thinking',
            data: {
              step: iteration,
              action: 'reasoning',
              summary: thinkingSummary
            }
          });
        } else {
          const thinkingSummary = `正在分析工具结果并决定下一步 (第 ${toolCallCount} 次工具调用后)...`;
          allThinkingSteps.push(thinkingSummary);
          onProgress?.({
            conversationId,
            type: 'thinking',
            data: {
              step: iteration,
              action: 'reasoning',
              summary: thinkingSummary
            }
          });
        }

        // 调用 LLM（带超时保护）
        let response: LLMResponse;
        try {
          response = await this.callLLMWithTimeout(provider, messages, streamCallbacks, allTools);
        } catch (llmError: any) {
          console.error(`[AgentLoop] LLM call failed at iteration ${iteration}:`, llmError.message);
          // 如果已有部分内容，追加错误信息
          if (assistantContent.trim()) {
            assistantContent += `\n\n⚠️ AI 调用出错: ${llmError.message}`;
          } else {
            assistantContent = `⚠️ AI 调用出错: ${llmError.message}`;
          }
          // 将错误通过 chunk 流发到前端
          callbacks?.onChunk?.(`\n\n⚠️ ${llmError.message}`);
          onProgress?.({
            conversationId,
            type: 'chunk',
            data: { chunk: `\n\n⚠️ ${llmError.message}` }
          });
          break;
        }

        console.log(`[AgentLoop] Iteration ${iteration}: finish_reason=${response.finish_reason}, ` +
          `content_length=${response.content?.length || 0}, tool_calls=${response.tool_calls?.length || 0}`);

        totalTokens += response.usage?.totalTokens || 0;

        // 累积 LLM 输出的文本内容
        if (response.content) {
          assistantContent += response.content;
        }

        // ===== 关键修复：用 tool_calls 是否存在来判断，而不是依赖 finish_reason =====
        // 很多 OpenAI 兼容 API（DeepSeek, Moonshot, 通义千问等）即使返回了 tool_calls，
        // finish_reason 也可能是 "stop" 而不是 "tool_calls"。
        const hasToolCalls = response.tool_calls && response.tool_calls.length > 0;

        if (!hasToolCalls) {
          // LLM 决定不再调用工具 → 循环结束
          console.log(`[AgentLoop] No tool calls in response. Breaking loop. (finish_reason=${response.finish_reason})`);
          break;
        }

        console.log(`[AgentLoop] LLM requested ${response.tool_calls!.length} tool call(s)`);

        // ===== 有工具调用 → 执行 =====
        const currentToolCalls = response.tool_calls!;

        // 将 assistant 消息（含 tool_calls）追加到消息序列
        messages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: currentToolCalls
        });

        // 逐个执行工具
        for (const toolCall of currentToolCalls) {
          const toolName = toolCall.function.name;
          const startTime = Date.now();

          console.log(`[AgentLoop] Executing tool: ${toolName}, args: ${toolCall.function.arguments.substring(0, 200)}`);

          // 非流式模式下手动发送 tool_call started
          if (!provider.chatStream) {
            callbacks?.onToolCall?.(toolName, 'started');
            onProgress?.({
              conversationId,
              type: 'tool_call',
              data: { toolName, status: 'started' }
            });
          }

          // 发送思考事件
          const toolThinkingSummary = `正在调用 ${toolName}...`;
          allThinkingSteps.push(toolThinkingSummary);
          onProgress?.({
            conversationId,
            type: 'thinking',
            data: {
              step: iteration,
              action: 'calling_tool',
              toolName,
              summary: toolThinkingSummary
            }
          });

          try {
            const parsedArgs = JSON.parse(toolCall.function.arguments);
            const guard = governor.guard(toolName, parsedArgs);

            if (!guard.allowed) {
              // 工具调用被治理器拒绝
              const duration = Date.now() - startTime;
              const errorResult = { error: guard.reason, details: guard.errors };
              console.warn(`[AgentLoop] Tool ${toolName} rejected by governor:`, guard.reason);

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

            // 执行工具
            const result = await this.toolExecutor.execute(toolName, guard.normalizedArgs, { userId });
            governor.recordCall(toolName);
            const executionDuration = Date.now() - startTime;

            console.log(`[AgentLoop] Tool ${toolName} completed in ${executionDuration}ms, result keys: ${Object.keys(result as any || {}).join(', ')}`);

            allToolCalls.push({
              name: toolName,
              arguments: toolCall.function.arguments,
              result,
              status: 'completed',
              duration: executionDuration
            });

            // 将工具结果追加到消息序列
            messages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id
            });

            callbacks?.onToolCall?.(toolName, 'completed');
            onProgress?.({
              conversationId,
              type: 'tool_call',
              data: { toolName, status: 'completed', result, duration: executionDuration }
            });

          } catch (error: any) {
            const duration = Date.now() - startTime;
            console.error(`[AgentLoop] Tool ${toolName} failed:`, error.message);

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

            callbacks?.onToolCall?.(toolName, 'completed');
            onProgress?.({
              conversationId,
              type: 'tool_call',
              data: { toolName, status: 'failed', result: { error: error.message }, duration }
            });
          }

          toolCallCount++;

          // 安全阀：总工具调用次数超限
          if (toolCallCount >= MAX_TOOL_CALLS) {
            console.warn(`[AgentLoop] Tool call limit reached (${MAX_TOOL_CALLS})`);
            break;
          }
        }

        // 如果工具调用已超限，跳出主循环
        if (toolCallCount >= MAX_TOOL_CALLS) {
          break;
        }
      }
    } catch (loopError: any) {
      // 循环内未预料的异常 — 确保不会丢失已有内容
      console.error('[AgentLoop] Unexpected error in ReAct loop:', loopError.message, loopError.stack);
      if (!assistantContent.trim()) {
        assistantContent = `⚠️ 处理过程中出现错误: ${loopError.message}`;
      } else {
        assistantContent += `\n\n⚠️ ${loopError.message}`;
      }
      // 将错误流式输出到前端
      callbacks?.onChunk?.(`\n\n⚠️ ${loopError.message}`);
      onProgress?.({
        conversationId,
        type: 'chunk',
        data: { chunk: `\n\n⚠️ ${loopError.message}` }
      });
    }

    // ========== 4.5 幻觉检测：LLM 声称执行了变更操作但未调用工具 ==========
    const hallucinationCheck = this.detectHallucinatedMutation(assistantContent, allToolCalls);
    if (hallucinationCheck.detected) {
      console.warn(`[AgentLoop] ⚠️ Hallucinated mutation detected! Claims: [${hallucinationCheck.claimedActions.join(', ')}], but no mutation tools were called.`);
      
      // 追加警告信息到回复
      const warningMsg = `\n\n⚠️ 系统检测到异常：以上回复声称执行了操作但实际未调用工具，操作并未真正执行。请重新发送你的请求。`;
      assistantContent += warningMsg;
      
      // 流式发送警告到前端
      callbacks?.onChunk?.(warningMsg);
      onProgress?.({
        conversationId,
        type: 'chunk',
        data: { chunk: warningMsg }
      });
    }

    // ========== 5. 保存并返回（无论成功失败都保存，确保 complete 事件一定发出） ==========
    console.log(`[AgentLoop] Saving message. Content length: ${assistantContent.length}, tool calls: ${allToolCalls.length}`);

    try {
      const assistantMessage = await this.messageRepo.create({
        conversationId,
        role: 'assistant',
        content: assistantContent || '(无回答)',
        tokenCount: totalTokens,
        toolCalls: allToolCalls.length > 0 ? allToolCalls as any : undefined,
        thinkingSteps: allThinkingSteps.length > 0 ? allThinkingSteps as any : undefined
      });

      await this.conversationRepo.update(conversationId, {});

      callbacks?.onComplete?.(assistantMessage);
      onProgress?.({
        conversationId,
        type: 'complete',
        data: { message: assistantMessage }
      });

      console.log(`[AgentLoop] Run completed successfully.`);

      return assistantMessage;
    } catch (saveError: any) {
      // 即使保存失败，也要发出 complete 事件，防止前端卡死
      console.error('[AgentLoop] Failed to save message:', saveError.message);

      const fallbackMessage = {
        id: `error-${Date.now()}`,
        conversationId,
        role: 'assistant' as const,
        content: assistantContent || `⚠️ 保存失败: ${saveError.message}`,
        createdAt: new Date(),
        deletedAt: null,
        toolCalls: null,
        toolCallId: null,
        tokenCount: totalTokens
      } as unknown as Message;

      callbacks?.onComplete?.(fallbackMessage);
      onProgress?.({
        conversationId,
        type: 'complete',
        data: { message: fallbackMessage }
      });

      throw saveError;
    }
  }
}
