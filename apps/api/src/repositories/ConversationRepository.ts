import { prisma, Conversation, Prisma } from "@subcare/database";

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * 对话会话数据仓库
 * 封装对 Conversation 表的所有数据库操作
 */
export class ConversationRepository {
  /**
   * 创建新的对话会话
   * @param userId 用户 ID
   * @param data 可选的对话数据
   * @returns 创建的对话实体
   */
  async create(userId: string, data?: Partial<Pick<Conversation, 'title' | 'model'>>): Promise<Conversation> {
    return prisma.conversation.create({
      data: {
        userId,
        title: data?.title ?? 'New Chat',
        model: data?.model,
      },
    });
  }

  /**
   * 根据 ID 查找对话
   * @param id 对话 ID
   * @returns 对话实体或 null
   */
  async findById(id: string): Promise<Conversation | null> {
    return prisma.conversation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  /**
   * 根据 ID 查找对话（包含消息）
   * @param id 对话 ID
   * @returns 对话实体（含消息）或 null
   */
  async findByIdWithMessages(id: string): Promise<(Conversation & { messages: any[] }) | null> {
    return prisma.conversation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * 查找用户的对话列表
   * @param userId 用户 ID
   * @param options 分页参数
   * @returns 对话列表
   */
  async findByUserId(
    userId: string,
    options?: PaginationOptions
  ): Promise<{ items: Conversation[]; total: number }> {
    const { page, limit } = options || {};
    const take = limit || undefined;
    const skip = page && limit ? (page - 1) * limit : undefined;

    const where: Prisma.ConversationWhereInput = {
      userId,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.conversation.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * 更新对话信息
   * @param id 对话 ID
   * @param data 更新数据
   * @returns 更新后的对话实体
   */
  async update(id: string, data: Partial<Pick<Conversation, 'title' | 'model'>> & { contextInfo?: any }): Promise<Conversation> {
    return prisma.conversation.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.contextInfo !== undefined && { contextInfo: data.contextInfo }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 软删除对话
   * @param id 对话 ID
   */
  async softDelete(id: string): Promise<void> {
    await prisma.conversation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 批量软删除用户的所有对话
   * @param userId 用户 ID
   */
  async softDeleteByUserId(userId: string): Promise<void> {
    await prisma.conversation.updateMany({
      where: {
        userId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 硬删除对话（慎用）
   * @param id 对话 ID
   */
  async delete(id: string): Promise<Conversation> {
    return prisma.conversation.delete({
      where: { id },
    });
  }

  /**
   * 验证对话是否属于用户
   * @param conversationId 对话 ID
   * @param userId 用户 ID
   * @returns 是否属于该用户
   */
  async belongsToUser(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
        deletedAt: null,
      },
      select: { id: true },
    });
    return conversation !== null;
  }
}
