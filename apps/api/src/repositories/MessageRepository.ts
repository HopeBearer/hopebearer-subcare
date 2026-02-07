import { prisma, Message, Prisma } from "@subcare/database";

export interface MessageCreateInput {
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: Prisma.InputJsonValue;
  toolCallId?: string;
  tokenCount?: number;
  thinkingSteps?: Prisma.InputJsonValue;
}

export interface MessagePaginationOptions {
  page?: number;
  limit?: number;
  before?: string; // Message ID for cursor-based pagination
  after?: string;  // Message ID for cursor-based pagination
}

/**
 * 消息数据仓库
 * 封装对 Message 表的所有数据库操作
 */
export class MessageRepository {
  /**
   * 创建新消息
   * @param data 消息数据
   * @returns 创建的消息实体
   */
  async create(data: MessageCreateInput): Promise<Message> {
    return prisma.message.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        toolCalls: data.toolCalls,
        toolCallId: data.toolCallId,
        tokenCount: data.tokenCount,
        thinkingSteps: data.thinkingSteps,
      },
    });
  }

  /**
   * 批量创建消息
   * @param messages 消息数组
   * @returns 创建的消息数量
   */
  async createMany(messages: MessageCreateInput[]): Promise<Prisma.BatchPayload> {
    return prisma.message.createMany({
      data: messages.map((msg) => ({
        conversationId: msg.conversationId,
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
        tokenCount: msg.tokenCount,
        thinkingSteps: msg.thinkingSteps,
      })),
    });
  }

  /**
   * 根据 ID 查找消息
   * @param id 消息 ID
   * @returns 消息实体或 null
   */
  async findById(id: string): Promise<Message | null> {
    return prisma.message.findUnique({
      where: { id },
    });
  }

  /**
   * 按对话 ID 分页查询消息（支持游标分页）
   * @param conversationId 对话 ID
   * @param options 分页参数
   * @returns 消息列表和总数
   */
  async findByConversationId(
    conversationId: string,
    options?: MessagePaginationOptions
  ): Promise<{ items: Message[]; total: number }> {
    const { page, limit, before, after } = options || {};
    const take = limit || undefined;
    const skip = page && limit ? (page - 1) * limit : undefined;

    // 获取总数（该对话的所有消息）
    const total = await prisma.message.count({ where: { conversationId } });

    // 如果有 before 游标，使用游标分页
    if (before) {
      // 使用 Prisma 的游标分页
      const items = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        cursor: { id: before },
        skip: 1, // 跳过游标本身
        take,
      });
      // 返回时反转，保持时间升序（从旧到新）
      return { items: items.reverse(), total };
    }

    // 如果有 after 游标
    if (after) {
      const items = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        cursor: { id: after },
        skip: 1, // 跳过游标本身
        take,
      });
      return { items, total };
    }

    // 普通查询（最新 N 条）
    const items = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return { items, total };
  }

  /**
   * 获取对话的最新 N 条消息
   * @param conversationId 对话 ID
   * @param count 消息数量
   * @returns 消息列表（按时间升序）
   */
  async findLatest(conversationId: string, count: number): Promise<Message[]> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: count,
    });
    // 返回按时间升序排列
    return messages.reverse();
  }

  /**
   * 获取对话的所有消息
   * @param conversationId 对话 ID
   * @returns 消息列表（按时间升序）
   */
  async findAllByConversationId(conversationId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 删除对话的所有消息
   * @param conversationId 对话 ID
   * @returns 删除的消息数量
   */
  async deleteByConversationId(conversationId: string): Promise<Prisma.BatchPayload> {
    return prisma.message.deleteMany({
      where: { conversationId },
    });
  }

  /**
   * 统计对话的消息数量
   * @param conversationId 对话 ID
   * @returns 消息数量
   */
  async countByConversationId(conversationId: string): Promise<number> {
    return prisma.message.count({
      where: { conversationId },
    });
  }

  /**
   * 计算对话的总 token 数
   * @param conversationId 对话 ID
   * @returns 总 token 数
   */
  async sumTokensByConversationId(conversationId: string): Promise<number> {
    const result = await prisma.message.aggregate({
      where: { conversationId },
      _sum: { tokenCount: true },
    });
    return result._sum.tokenCount || 0;
  }
}
