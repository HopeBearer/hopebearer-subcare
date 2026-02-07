/**
 * Chat Service
 * 聊天服务 - 主入口，负责意图分类和路由
 */

import { Conversation, Message, prisma } from '@subcare/database';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MessageRepository } from '../repositories/MessageRepository';
import { LLMFactory } from '../infrastructure/ai/LLMFactory';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { ToolExecutor } from '../infrastructure/ai/tools/ToolExecutor';
import { 
  intentClassifier, 
  QueryIntent, 
  DbQueryHandler,
  validateOutput,
  buildSafeResponse,
  detectLanguage
} from './intent';
import { buildDbOnlyPrompt } from './prompts/db-only-prompt';
import { LLMMessage } from '../infrastructure/ai/interfaces/LLMProvider';
import {
  ChatStreamCallbacks,
  ChatProgressEvent,
  ChatProgressCallback,
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  MutationHandler,
  ServiceInfoHandler,
  GeneralHandler
} from './chat';
import { isContextDependentMessage, isLikelyMutationContext, isFollowUpMutationMessage } from './chat/utils';

export type { ChatStreamCallbacks, ChatProgressEvent, ChatProgressCallback };

export interface ChatServiceDeps {
  conversationRepo: ConversationRepository;
  messageRepo: MessageRepository;
  toolExecutor: ToolExecutor;
}

export class ChatService {
  private conversationRepo: ConversationRepository;
  private messageRepo: MessageRepository;
  private toolExecutor: ToolExecutor;
  
  // 各类型处理器
  private dbQueryHandler: DbQueryHandler;
  private mutationHandler: MutationHandler;
  private serviceInfoHandler: ServiceInfoHandler;
  private generalHandler: GeneralHandler;

  constructor(deps: ChatServiceDeps) {
    this.conversationRepo = deps.conversationRepo;
    this.messageRepo = deps.messageRepo;
    this.toolExecutor = deps.toolExecutor;
    
    // 初始化各处理器
    this.dbQueryHandler = new DbQueryHandler(deps.toolExecutor);
    this.mutationHandler = new MutationHandler(deps.messageRepo, deps.conversationRepo, deps.toolExecutor);
    this.serviceInfoHandler = new ServiceInfoHandler(deps.messageRepo, deps.conversationRepo, deps.toolExecutor);
    this.generalHandler = new GeneralHandler(deps.messageRepo, deps.conversationRepo, deps.toolExecutor);
  }

  // ==================== 对话管理 ====================

  async createConversation(userId: string, title?: string): Promise<Conversation> {
    return this.conversationRepo.create(userId, { title });
  }

  async listConversations(userId: string, options?: { page?: number; limit?: number }) {
    return this.conversationRepo.findByUserId(userId, options);
  }

  async getConversation(conversationId: string, userId: string) {
    const belongs = await this.conversationRepo.belongsToUser(conversationId, userId);
    if (!belongs) {
      throw new AppError('CONVERSATION_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Conversation not found'
      });
    }
    return this.conversationRepo.findByIdWithMessages(conversationId);
  }

  async updateConversation(conversationId: string, userId: string, data: { title?: string }): Promise<Conversation> {
    const belongs = await this.conversationRepo.belongsToUser(conversationId, userId);
    if (!belongs) {
      throw new AppError('CONVERSATION_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Conversation not found'
      });
    }
    return this.conversationRepo.update(conversationId, data);
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const belongs = await this.conversationRepo.belongsToUser(conversationId, userId);
    if (!belongs) {
      throw new AppError('CONVERSATION_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Conversation not found'
      });
    }
    await this.conversationRepo.softDelete(conversationId);
  }

  async getHistory(
    conversationId: string,
    userId: string,
    options?: { limit?: number; before?: string }
  ): Promise<{ items: Message[]; total: number }> {
    const belongs = await this.conversationRepo.belongsToUser(conversationId, userId);
    if (!belongs) {
      throw new AppError('CONVERSATION_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Conversation not found'
      });
    }
    return this.messageRepo.findByConversationId(conversationId, {
      limit: options?.limit || 6,
      before: options?.before
    });
  }

  // ==================== 消息处理 ====================

  /**
   * 发送消息并获取 AI 回复
   * 三层判断模型：Intent 分类 -> 强制工具调用 -> 输出校验
   */
  async sendMessage(params: {
    conversationId: string;
    userId: string;
    content: string;
    language?: string;
    callbacks?: ChatStreamCallbacks;
    onProgress?: ChatProgressCallback;
  }): Promise<Message> {
    const { conversationId, userId, content, callbacks, onProgress } = params;

    // 验证消息长度
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new AppError('MESSAGE_TOO_LONG', StatusCodes.BAD_REQUEST, {
        message: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`,
        params: { maxLength: MAX_MESSAGE_LENGTH, currentLength: content.length }
      });
    }

    // 验证对话归属
    const belongs = await this.conversationRepo.belongsToUser(conversationId, userId);
    if (!belongs) {
      throw new AppError('CONVERSATION_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Conversation not found'
      });
    }

    // 获取用户 AI 配置
    const aiConfig = await this.getActiveAIConfig(userId);
    if (!aiConfig) {
      throw new AppError('AI_NOT_CONFIGURED', StatusCodes.BAD_REQUEST, {
        message: 'AI provider not configured. Please set up your AI configuration first.'
      });
    }

    // 获取历史消息
    const history = await this.messageRepo.findLatest(conversationId, MAX_HISTORY_MESSAGES - 1);
    const isFirstMessage = history.length === 0;
    const lastAssistantMessage = [...history].reverse().find(msg => msg.role === 'assistant');

    // 意图分类
    let intentResult = intentClassifier.classify(content);
    const contextDependent = isContextDependentMessage(content);
    const followUpMutation = isFollowUpMutationMessage(content);
    if ((contextDependent || followUpMutation) && lastAssistantMessage?.content && isLikelyMutationContext(lastAssistantMessage.content)) {
      intentResult = {
        ...intentResult,
        intent: QueryIntent.DB_MUTATION,
        requiresDbCall: false,
        requiresServiceLookup: false
      };
    }
    console.log('[ChatService] Intent:', intentResult.intent, 'confidence:', intentResult.confidence);

    // 保存用户消息
    await this.messageRepo.create({ conversationId, role: 'user', content });

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    });

    // 创建 LLM Provider
    const provider = await this.createProvider(aiConfig);

    // 首条消息时启动标题生成
    if (isFirstMessage) {
      void this.generateTitleAndNotify(conversationId, content, provider, onProgress);
    }

    try {
      // 根据 Intent 选择处理路径
      if (intentResult.requiresDbCall) {
        return await this.handleDbQuery({
          conversationId, userId, content,
          intent: intentResult.intent,
          provider, userCurrency: user?.currency,
          callbacks, onProgress
        });
      } else if (intentResult.intent === QueryIntent.DB_MUTATION) {
        return await this.mutationHandler.handle({
          conversationId, userId, content,
          provider, userCurrency: user?.currency,
          callbacks, onProgress
        });
      } else if (intentResult.requiresServiceLookup) {
        return await this.serviceInfoHandler.handle({
          conversationId, userId, content,
          provider, userCurrency: user?.currency,
          callbacks, onProgress
        });
      } else {
        return await this.generalHandler.handle({
          conversationId, userId, content, history,
          provider, userCurrency: user?.currency,
          callbacks, onProgress
        });
      }
    } catch (error: any) {
      await this.messageRepo.create({
        conversationId,
        role: 'assistant',
        content: `Error: ${error.message}`
      });
      callbacks?.onError?.(error);
      onProgress?.({ conversationId, type: 'error', data: { error: error.message } });
      throw error;
    }
  }

  // ==================== 内部方法 ====================

  /**
   * 处理数据库查询（DB_QUERY / DB_FACT / DB_AGGREGATE）
   */
  private async handleDbQuery(params: {
    conversationId: string;
    userId: string;
    content: string;
    intent: QueryIntent;
    provider: any;
    userCurrency?: string | null;
    callbacks?: ChatStreamCallbacks;
    onProgress?: ChatProgressCallback;
  }): Promise<Message> {
    const { conversationId, userId, content, intent, provider, userCurrency, callbacks, onProgress } = params;

    // 预先确定工具名称
    const { determineRequiredTool } = await import('./intent/DbQueryHandler');
    const predictedToolName = determineRequiredTool(intent, content);
    
    onProgress?.({
      conversationId,
      type: 'tool_call',
      data: { toolName: predictedToolName, status: 'started' }
    });

    const startTime = Date.now();
    const dbResult = await this.dbQueryHandler.executeQuery(intent, content, userId);
    const duration = Date.now() - startTime;

    onProgress?.({
      conversationId,
      type: 'tool_call',
      data: { toolName: dbResult.tool, status: 'completed', result: dbResult.data, duration }
    });

    // 检测语言并构建提示词
    const detectedLanguage = detectLanguage(content);
    const dbOnlyPrompt = buildDbOnlyPrompt(dbResult.data, userCurrency || undefined);
    
    const messages: LLMMessage[] = [
      { role: 'system', content: dbOnlyPrompt },
      { role: 'user', content }
    ];

    const streamCallbacks = {
      onChunk: (chunk: string) => {
        callbacks?.onChunk?.(chunk);
        onProgress?.({ conversationId, type: 'chunk', data: { chunk } });
      }
    };

    const response = provider.chatStream 
      ? await provider.chatStream(messages, streamCallbacks)
      : await provider.chat(messages);

    let assistantContent = response.content || '';

    // 输出校验
    const validation = validateOutput(assistantContent, dbResult, content);
    if (!validation.valid) {
      console.warn('[ChatService] Output validation failed:', validation.errors);
      assistantContent = buildSafeResponse(dbResult, content, detectedLanguage);
      onProgress?.({ conversationId, type: 'chunk', data: { chunk: `\n\n[校正] ${assistantContent}` } });
    }

    // 保存消息
    const assistantMessage = await this.messageRepo.create({
      conversationId,
      role: 'assistant',
      content: assistantContent,
      tokenCount: response.usage?.totalTokens || 0,
      toolCalls: [{
        name: dbResult.tool,
        arguments: JSON.stringify({ intent, query: content }),
        result: dbResult.data,
        status: dbResult.success ? 'completed' : 'failed'
      }] as any
    });

    await this.conversationRepo.update(conversationId, {});
    callbacks?.onComplete?.(assistantMessage);
    onProgress?.({ conversationId, type: 'complete', data: { message: assistantMessage } });

    return assistantMessage;
  }

  /**
   * 获取活跃 AI 配置
   */
  private async getActiveAIConfig(userId: string) {
    return prisma.userAIConfig.findFirst({
      where: { userId, isActive: true, deletedAt: null }
    });
  }

  /**
   * 创建 LLM Provider
   */
  private async createProvider(aiConfig: any) {
    const aiProvider = await prisma.aIProvider.findFirst({
      where: { slug: aiConfig.provider }
    });

    if (!aiProvider) {
      throw new AppError('AI_PROVIDER_NOT_FOUND', StatusCodes.BAD_REQUEST, {
        message: `AI provider ${aiConfig.provider} not found`
      });
    }

    return LLMFactory.createProvider({
      apiKey: aiConfig.apiKey,
      model: aiConfig.model || 'gpt-4o-mini',
      baseUrl: aiConfig.baseUrl || aiProvider.baseUrl,
      apiFormat: aiProvider.apiFormat as 'OPENAI' | 'ANTHROPIC' | 'CUSTOM',
      providerSlug: aiConfig.provider
    });
  }

  /**
   * 生成对话标题
   */
  private async generateTitleAndNotify(
    conversationId: string,
    firstMessage: string,
    provider: any,
    onProgress?: ChatProgressCallback
  ): Promise<void> {
    try {
      if (!firstMessage || typeof firstMessage !== 'string') return;

      const response = await provider.chat([
        { role: 'system', content: 'Generate a short title (max 30 chars) for this conversation. Reply with ONLY the title, no quotes or extra text.' },
        { role: 'user', content: firstMessage.substring(0, 200) }
      ]);

      const title = response.content?.trim()?.substring(0, 50) || 'New Chat';
      await this.conversationRepo.update(conversationId, { title });
      onProgress?.({ conversationId, type: 'title_updated', data: { title } });
    } catch (error) {
      console.error('[ChatService] Failed to generate title:', error);
    }
  }
}
