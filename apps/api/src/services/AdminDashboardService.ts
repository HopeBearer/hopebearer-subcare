import { prisma } from '@subcare/database';

/**
 * 管理后台仪表盘服务
 * 提供平台级运营统计数据
 */
export class AdminDashboardService {
  /**
   * 获取平台概览统计
   */
  async getOverviewStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      newUsersLast7d,
      newUsersLast30d,
      totalSubscriptions,
      activeSubscriptions,
      totalCategories,
      errorLogsLast24h,
      warnLogsLast24h,
      totalLogs,
      totalPayments,
      thisMonthPayments,
      totalConversations,
      totalNotifications,
      unreadNotifications,
    ] = await Promise.all([
      // Users
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: last7d }, deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: last30d }, deletedAt: null } }),
      // Subscriptions
      prisma.subscription.count({ where: { deletedAt: null } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      // Categories
      prisma.category.count({ where: { deletedAt: null, userId: null } }),
      // Logs
      prisma.systemLog.count({ where: { level: 'ERROR', createdAt: { gte: last24h } } }),
      prisma.systemLog.count({ where: { level: 'WARN', createdAt: { gte: last24h } } }),
      prisma.systemLog.count({ where: { deletedAt: null } }),
      // Payments
      prisma.paymentRecord.count(),
      prisma.paymentRecord.aggregate({
        where: { billingDate: { gte: thisMonthStart }, status: 'PAID' },
        _sum: { amount: true },
      }),
      // AI Conversations
      prisma.conversation.count({ where: { deletedAt: null } }),
      // Notifications
      prisma.notification.count({ where: { deletedAt: null } }),
      prisma.notification.count({ where: { deletedAt: null, isRead: false } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newLast7d: newUsersLast7d,
        newLast30d: newUsersLast30d,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
      },
      categories: {
        total: totalCategories,
      },
      logs: {
        total: totalLogs,
        errorsLast24h: errorLogsLast24h,
        warningsLast24h: warnLogsLast24h,
      },
      payments: {
        total: totalPayments,
        thisMonthAmount: Number(thisMonthPayments._sum.amount || 0),
      },
      conversations: {
        total: totalConversations,
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
    };
  }

  /**
   * 获取用户增长趋势（最近 N 天）
   */
  async getUserGrowthTrend(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: {
        createdAt: { gte: startDate },
        deletedAt: null,
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const key = date.toISOString().split('T')[0];
      dailyCounts[key] = 0;
    }

    users.forEach((user) => {
      const key = user.createdAt.toISOString().split('T')[0];
      if (dailyCounts[key] !== undefined) {
        dailyCounts[key]++;
      }
    });

    const labels = Object.keys(dailyCounts);
    const values = Object.values(dailyCounts);

    // Calculate cumulative total
    let cumulative = await prisma.user.count({
      where: { createdAt: { lt: startDate }, deletedAt: null },
    });
    const cumulativeValues = values.map((v) => {
      cumulative += v;
      return cumulative;
    });

    return { labels, values, cumulativeValues };
  }

  /**
   * 获取订阅统计（分类分布 + 状态分布）
   */
  async getSubscriptionStats() {
    const [statusGroups, categoryGroups] = await Promise.all([
      prisma.subscription.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      prisma.subscription.groupBy({
        by: ['categoryName'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
    ]);

    const statusDistribution = statusGroups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));

    const categoryDistribution = categoryGroups
      .map((g) => ({
        category: g.categoryName || 'Other',
        count: g._count.id,
      }))
      .sort((a, b) => b.count - a.count);

    return { statusDistribution, categoryDistribution };
  }
}
