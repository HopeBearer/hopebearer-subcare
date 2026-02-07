/**
 * Chat Service
 * 聊天服务 - 主入口
 * 
 * ReAct 架构：所有消息统一由 AgentLoop 处理
 * 不再使用 IntentClassifier 路由到不同 Handler
 */

import { Conversation, Message, prisma } from '@subcare/database';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MessageRepository } from '../repositories/MessageRepository';
import { LLMFactory } from '../infrastructure/ai/LLMFactory';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { ToolExecutor } from '../infrastructure/ai/tools/ToolExecutor';
import {
  ChatStreamCallbacks,
  ChatProgressEvent,
  ChatProgressCallback,
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  AgentLoop
} from './chat';

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
  
  // 统一的 ReAct 代理循环
  private agentLoop: AgentLoop;

  constructor(deps: ChatServiceDeps) {
    this.conversationRepo = deps.conversationRepo;
    this.messageRepo = deps.messageRepo;
    this.toolExecutor = deps.toolExecutor;
    
    // 初始化统一的 AgentLoop（替代旧的 4 个 Handler）
    this.agentLoop = new AgentLoop(
      deps.messageRepo,
      deps.conversationRepo,
      deps.toolExecutor
    );
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
   * 统一由 AgentLoop (ReAct 循环) 处理
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

    // 保存用户消息
    await this.messageRepo.create({ conversationId, role: 'user', content });

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true, name: true }
    });

    // 创建 LLM Provider
    const provider = await this.createProvider(aiConfig);

    // 首条消息时启动标题生成（异步，不阻塞主流程）
    if (isFirstMessage) {
      void this.generateTitleAndNotify(conversationId, content, provider, onProgress);
    }

    try {
      // 统一由 AgentLoop 处理所有类型的请求
      return await this.agentLoop.run({
        conversationId,
        userId,
        content,
        history,
        provider,
        userCurrency: user?.currency,
        userName: user?.name || undefined,
        callbacks,
        onProgress
      });
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
