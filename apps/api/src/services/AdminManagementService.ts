import { prisma } from '@subcare/database';

/**
 * 管理后台扩展管理服务
 * 提供汇率、支付记录、通知、AI对话、搜索用量等管理功能
 */
export class AdminManagementService {
  // ===================== 汇率管理 =====================

  /**
   * 获取所有汇率列表
   */
  async getExchangeRates() {
    const rates = await prisma.exchangeRate.findMany({
      where: { deletedAt: null },
      orderBy: { currency: 'asc' },
    });

    const lastUpdated = rates.length > 0
      ? rates.reduce((latest, r) => (r.updatedAt > latest ? r.updatedAt : latest), rates[0].updatedAt)
      : null;

    return {
      rates: rates.map((r) => ({
        id: r.id,
        currency: r.currency,
        rate: Number(r.rate),
        base: r.base,
        updatedAt: r.updatedAt,
      })),
      total: rates.length,
      lastUpdated,
    };
  }

  /**
   * 手动更新单个汇率
   */
  async updateExchangeRate(id: string, rate: number) {
    return prisma.exchangeRate.update({
      where: { id },
      data: { rate },
    });
  }

  // ===================== 支付记录总览 =====================

  /**
   * 获取平台全部支付记录（分页）
   */
  async getPaymentRecords(params: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 20, status, userId, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      const billingDate: Record<string, Date> = {};
      if (startDate) billingDate.gte = new Date(startDate);
      if (endDate) billingDate.lte = new Date(endDate);
      where.billingDate = billingDate;
    }

    const [items, total, aggregate] = await Promise.all([
      prisma.paymentRecord.findMany({
        where: where as any,
        include: {
          subscription: { select: { name: true, icon: true } },
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { billingDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.paymentRecord.count({ where: where as any }),
      prisma.paymentRecord.aggregate({
        where: where as any,
        _sum: { amount: true },
      }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        currency: r.currency,
        exchangeRate: r.exchangeRate ? Number(r.exchangeRate) : null,
        billingDate: r.billingDate,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        status: r.status,
        note: r.note,
        subscription: r.subscription
          ? { name: r.subscription.name, icon: r.subscription.icon }
          : null,
        user: r.user
          ? { id: r.user.id, email: r.user.email, name: r.user.name }
          : null,
        createdAt: r.createdAt,
      })),
      total,
      totalAmount: Number(aggregate._sum.amount || 0),
    };
  }

  /**
   * 支付统计概览
   */
  async getPaymentStats() {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [totalCount, totalAmount, thisMonthAmount, lastMonthAmount, statusGroups, currencyGroups] =
      await Promise.all([
        prisma.paymentRecord.count(),
        prisma.paymentRecord.aggregate({ _sum: { amount: true } }),
        prisma.paymentRecord.aggregate({
          where: {
            billingDate: { gte: thisMonthStart },
            status: 'PAID',
          },
          _sum: { amount: true },
        }),
        prisma.paymentRecord.aggregate({
          where: {
            billingDate: { gte: lastMonthStart, lte: lastMonthEnd },
            status: 'PAID',
          },
          _sum: { amount: true },
        }),
        prisma.paymentRecord.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        prisma.paymentRecord.groupBy({
          by: ['currency'],
          _count: { id: true },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalCount,
      totalAmount: Number(totalAmount._sum.amount || 0),
      thisMonthAmount: Number(thisMonthAmount._sum.amount || 0),
      lastMonthAmount: Number(lastMonthAmount._sum.amount || 0),
      statusDistribution: statusGroups.map((g) => ({
        status: g.status,
        count: g._count.id,
      })),
      currencyDistribution: currencyGroups.map((g) => ({
        currency: g.currency,
        count: g._count.id,
        amount: Number(g._sum.amount || 0),
      })),
    };
  }

  // ===================== 通知管理 =====================

  /**
   * 获取全平台通知列表（分页）
   */
  async getNotifications(params: {
    page?: number;
    limit?: number;
    type?: string;
    priority?: string;
    userId?: string;
    isRead?: string;
  }) {
    const { page = 1, limit = 20, type, priority, userId, isRead } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (userId) where.userId = userId;
    if (isRead === 'true') where.isRead = true;
    if (isRead === 'false') where.isRead = false;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where: where as any,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: where as any }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        type: n.type,
        isRead: n.isRead,
        priority: n.priority,
        link: n.link,
        actionLabel: n.actionLabel,
        user: n.user
          ? { id: n.user.id, email: n.user.email, name: n.user.name }
          : null,
        createdAt: n.createdAt,
      })),
      total,
    };
  }

  /**
   * 通知统计
   */
  async getNotificationStats() {
    const [total, unread, typeGroups, priorityGroups] = await Promise.all([
      prisma.notification.count({ where: { deletedAt: null } }),
      prisma.notification.count({ where: { deletedAt: null, isRead: false } }),
      prisma.notification.groupBy({
        by: ['type'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      prisma.notification.groupBy({
        by: ['priority'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
    ]);

    return {
      total,
      unread,
      readRate: total > 0 ? Number((((total - unread) / total) * 100).toFixed(1)) : 0,
      typeDistribution: typeGroups.map((g) => ({
        type: g.type,
        count: g._count.id,
      })),
      priorityDistribution: priorityGroups.map((g) => ({
        priority: g.priority,
        count: g._count.id,
      })),
    };
  }

  /**
   * 广播通知（向全部/指定用户发送系统通知）
   */
  async broadcastNotification(data: {
    title: string;
    content: string;
    type?: string;
    priority?: string;
    link?: string;
    userIds?: string[];
  }) {
    const { title, content, type = 'system', priority = 'NORMAL', link, userIds } = data;

    let targetUserIds: string[];

    if (userIds && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      // 发送给所有活跃用户
      const users = await prisma.user.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    }

    const notifications = targetUserIds.map((userId) => ({
      userId,
      title,
      content,
      type,
      priority,
      link: link || null,
      isRead: false,
    }));

    const result = await prisma.notification.createMany({ data: notifications });

    return { sent: result.count, targetUsers: targetUserIds.length };
  }

  // ===================== AI 对话监控 =====================

  /**
   * AI 对话统计
   */
  async getAIChatStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalConversations,
      totalMessages,
      conversationsLast24h,
      messagesLast24h,
      conversationsLast7d,
      tokenStats,
      roleGroups,
      activeUsers7d,
    ] = await Promise.all([
      prisma.conversation.count({ where: { deletedAt: null } }),
      prisma.message.count({ where: { deletedAt: null } }),
      prisma.conversation.count({ where: { createdAt: { gte: last24h }, deletedAt: null } }),
      prisma.message.count({ where: { createdAt: { gte: last24h }, deletedAt: null } }),
      prisma.conversation.count({ where: { createdAt: { gte: last7d }, deletedAt: null } }),
      prisma.message.aggregate({
        where: { deletedAt: null, tokenCount: { not: null } },
        _sum: { tokenCount: true },
        _avg: { tokenCount: true },
      }),
      prisma.message.groupBy({
        by: ['role'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      prisma.conversation.findMany({
        where: { createdAt: { gte: last7d }, deletedAt: null },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    return {
      totalConversations,
      totalMessages,
      conversationsLast24h,
      messagesLast24h,
      conversationsLast7d,
      activeUsersLast7d: activeUsers7d.length,
      tokens: {
        total: tokenStats._sum.tokenCount || 0,
        avgPerMessage: Math.round(Number(tokenStats._avg.tokenCount) || 0),
      },
      roleDistribution: roleGroups.map((g) => ({
        role: g.role,
        count: g._count.id,
      })),
    };
  }

  /**
   * 获取对话列表（管理员视角，可看所有用户）
   */
  async getConversations(params: {
    page?: number;
    limit?: number;
    userId?: string;
  }) {
    const { page = 1, limit = 20, userId } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      prisma.conversation.findMany({
        where: where as any,
        include: {
          user: { select: { id: true, email: true, name: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where: where as any }),
    ]);

    return {
      items: items.map((c) => ({
        id: c.id,
        title: c.title,
        model: c.model,
        user: c.user
          ? { id: c.user.id, email: c.user.email, name: c.user.name }
          : null,
        messageCount: c._count.messages,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
    };
  }

  // ===================== 搜索用量管理 =====================

  /**
   * 获取搜索用量统计
   */
  async getSearchUsageStats() {
    const [usageLogs, cacheCount, expiredCacheCount] = await Promise.all([
      prisma.searchUsageLog.findMany({
        orderBy: { month: 'desc' },
        take: 12,
      }),
      prisma.searchCache.count(),
      prisma.searchCache.count({
        where: { expiresAt: { lt: new Date() } },
      }),
    ]);

    const currentMonth = this.getCurrentMonth();
    const currentUsage = usageLogs.find((u) => u.month === currentMonth);

    return {
      currentMonth: {
        month: currentMonth,
        count: currentUsage?.count || 0,
        limit: currentUsage?.limit || 1000,
        remaining: Math.max(0, (currentUsage?.limit || 1000) - (currentUsage?.count || 0)),
        usagePercent: currentUsage
          ? Number(((currentUsage.count / currentUsage.limit) * 100).toFixed(1))
          : 0,
      },
      history: usageLogs.map((u) => ({
        month: u.month,
        count: u.count,
        limit: u.limit,
      })),
      cache: {
        total: cacheCount,
        expired: expiredCacheCount,
        active: cacheCount - expiredCacheCount,
      },
    };
  }

  /**
   * 清理过期搜索缓存
   */
  async cleanExpiredCache() {
    const result = await prisma.searchCache.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return { cleaned: result.count };
  }

  /**
   * 更新搜索月度额度
   */
  async updateSearchLimit(month: string, limit: number) {
    return prisma.searchUsageLog.upsert({
      where: { month },
      update: { limit },
      create: { month, count: 0, limit },
    });
  }

  // ===================== 用户 AI 配置概览 =====================

  /**
   * 获取用户 AI 配置统计
   */
  async getUserAIConfigStats() {
    const [providerGroups, totalConfigs, activeConfigs] = await Promise.all([
      prisma.userAIConfig.groupBy({
        by: ['provider'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      prisma.userAIConfig.count({ where: { deletedAt: null } }),
      prisma.userAIConfig.count({ where: { deletedAt: null, isActive: true } }),
    ]);

    return {
      totalConfigs,
      activeConfigs,
      providerDistribution: providerGroups
        .map((g) => ({
          provider: g.provider,
          count: g._count.id,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
