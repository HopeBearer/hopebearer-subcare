import { prisma, SystemLog, Prisma } from "@subcare/database";

export type SystemLogWithUser = SystemLog & {
  user: { name: string | null; email: string } | null;
};

export interface SystemLogFilter {
  level?: string;
  domain?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class SystemLogRepository {
  async findAll(
    filter: SystemLogFilter,
    skip: number,
    take: number
  ): Promise<{ items: SystemLogWithUser[]; total: number }> {
    const where: Prisma.SystemLogWhereInput = {};

    if (filter.level) {
      where.level = filter.level;
    }
    if (filter.domain) {
      where.domain = filter.domain;
    }
    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.startDate || filter.endDate) {
      where.createdAt = {
        gte: filter.startDate,
        lte: filter.endDate,
      };
    }

    const [items, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.systemLog.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return prisma.systemLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });
  }

  /**
   * 创建系统日志
   */
  async create(data: {
    level: string;
    domain: string;
    action: string;
    userId?: string | null;
    ip?: string;
    requestId?: string;
    metadata?: object;
    error?: string;
  }) {
    return prisma.systemLog.create({
      data: data as Prisma.SystemLogUncheckedCreateInput,
    });
  }

  // ===================== API 使用分析 =====================

  /**
   * API 请求量趋势（按日/小时聚合）
   */
  async getApiRequestTrend(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.systemLog.findMany({
      where: {
        domain: 'API',
        createdAt: { gte: since },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // 按日聚合
    const dailyMap = new Map<string, number>();
    for (const log of logs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }

    const labels: string[] = [];
    const values: number[] = [];
    const cursor = new Date(since);
    while (cursor <= new Date()) {
      const day = cursor.toISOString().slice(0, 10);
      labels.push(day);
      values.push(dailyMap.get(day) || 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    return { labels, values, total: logs.length };
  }

  /**
   * API 按小时分布（最近 24h）
   */
  async getApiHourlyDistribution() {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const logs = await prisma.systemLog.findMany({
      where: {
        domain: 'API',
        createdAt: { gte: since },
      },
      select: { createdAt: true },
    });

    const hourMap = new Map<number, number>();
    for (const log of logs) {
      const hour = log.createdAt.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }

    const labels: string[] = [];
    const values: number[] = [];
    for (let h = 0; h < 24; h++) {
      labels.push(`${String(h).padStart(2, '0')}:00`);
      values.push(hourMap.get(h) || 0);
    }

    return { labels, values };
  }

  /**
   * 热门接口 Top N
   */
  async getTopEndpoints(limit: number = 10) {
    const logs = await prisma.systemLog.findMany({
      where: { domain: 'API' },
      select: { action: true, metadata: true },
    });

    const endpointMap = new Map<string, number>();
    for (const log of logs) {
      const endpoint = log.action || 'unknown';
      endpointMap.set(endpoint, (endpointMap.get(endpoint) || 0) + 1);
    }

    return Array.from(endpointMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  /**
   * 错误率趋势
   */
  async getErrorRateTrend(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.systemLog.findMany({
      where: {
        domain: 'API',
        createdAt: { gte: since },
      },
      select: { level: true, createdAt: true, action: true },
    });

    // 按日聚合总请求和错误请求
    const dailyTotal = new Map<string, number>();
    const dailyErrors = new Map<string, number>();

    for (const log of logs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      dailyTotal.set(day, (dailyTotal.get(day) || 0) + 1);
      if (log.level === 'ERROR') {
        dailyErrors.set(day, (dailyErrors.get(day) || 0) + 1);
      }
    }

    const labels: string[] = [];
    const errorRates: number[] = [];
    const errorCounts: number[] = [];
    const totalCounts: number[] = [];

    const cursor = new Date(since);
    while (cursor <= new Date()) {
      const day = cursor.toISOString().slice(0, 10);
      const total = dailyTotal.get(day) || 0;
      const errors = dailyErrors.get(day) || 0;
      labels.push(day);
      totalCounts.push(total);
      errorCounts.push(errors);
      errorRates.push(total > 0 ? Number(((errors / total) * 100).toFixed(2)) : 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    return { labels, errorRates, errorCounts, totalCounts };
  }

  /**
   * 按用户的 API 调用量排行
   */
  async getTopApiUsers(limit: number = 10) {
    const groups = await prisma.systemLog.groupBy({
      by: ['userId'],
      _count: { id: true },
      where: { domain: 'API', userId: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // 获取用户信息
    const userIds = groups.map((g) => g.userId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return groups.map((g) => ({
      userId: g.userId,
      user: userMap.get(g.userId!) || null,
      count: g._count.id,
    }));
  }

  /**
   * API 使用总览统计
   */
  async getApiOverviewStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalRequests, last24hRequests, last7dRequests, errorCount24h, levelGroups] =
      await Promise.all([
        prisma.systemLog.count({ where: { domain: 'API' } }),
        prisma.systemLog.count({ where: { domain: 'API', createdAt: { gte: last24h } } }),
        prisma.systemLog.count({ where: { domain: 'API', createdAt: { gte: last7d } } }),
        prisma.systemLog.count({ where: { domain: 'API', level: 'ERROR', createdAt: { gte: last24h } } }),
        prisma.systemLog.groupBy({
          by: ['level'],
          _count: { id: true },
          where: { domain: 'API' },
        }),
      ]);

    return {
      totalRequests,
      last24hRequests,
      last7dRequests,
      errorCount24h,
      errorRate24h: last24hRequests > 0 ? Number(((errorCount24h / last24hRequests) * 100).toFixed(2)) : 0,
      levelDistribution: levelGroups.map((g) => ({ level: g.level, count: g._count.id })),
    };
  }
}
