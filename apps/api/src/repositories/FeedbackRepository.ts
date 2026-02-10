import { PrismaClient, Prisma } from '@subcare/database';

const prisma = new PrismaClient();

export interface FeedbackFilter {
  type?: string;
  status?: string;
  priority?: string;
  userId?: string;
}

export class FeedbackRepository {
  /**
   * 获取反馈列表（分页 + 筛选）
   */
  async findAll(filter: FeedbackFilter, skip: number = 0, limit: number = 20) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.userId) where.userId = filter.userId;

    const [items, total] = await Promise.all([
      prisma.feedback.findMany({
        where: where as Prisma.FeedbackWhereInput,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.feedback.count({ where: where as Prisma.FeedbackWhereInput }),
    ]);

    return { items, total };
  }

  /**
   * 根据 ID 查找
   */
  async findById(id: string) {
    return prisma.feedback.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * 创建反馈
   */
  async create(data: {
    userId: string;
    type: string;
    title: string;
    content: string;
    priority?: string;
  }) {
    return prisma.feedback.create({
      data: data as Prisma.FeedbackUncheckedCreateInput,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * 更新反馈（管理员操作：状态、管理员备注）
   */
  async update(id: string, data: {
    status?: string;
    priority?: string;
    adminNote?: string;
  }) {
    return prisma.feedback.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * 软删除反馈
   */
  async softDelete(id: string) {
    return prisma.feedback.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 获取统计
   */
  async getStats() {
    const [total, statusGroups, typeGroups, priorityGroups] = await Promise.all([
      prisma.feedback.count({ where: { deletedAt: null } }),
      prisma.feedback.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      prisma.feedback.groupBy({
        by: ['type'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      prisma.feedback.groupBy({
        by: ['priority'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
    ]);

    return {
      total,
      statusDistribution: statusGroups.map((g) => ({ status: g.status, count: g._count.id })),
      typeDistribution: typeGroups.map((g) => ({ type: g.type, count: g._count.id })),
      priorityDistribution: priorityGroups.map((g) => ({ priority: g.priority, count: g._count.id })),
    };
  }

  /**
   * 获取用户自己的反馈列表
   */
  async findByUserId(userId: string, skip: number = 0, limit: number = 20) {
    const [items, total] = await Promise.all([
      prisma.feedback.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.feedback.count({ where: { userId, deletedAt: null } }),
    ]);
    return { items, total };
  }
}
