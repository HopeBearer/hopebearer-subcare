import { prisma, SystemLog, Prisma } from "@subcare/database";

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
  ): Promise<{ items: SystemLog[]; total: number }> {
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
      }),
      prisma.systemLog.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<SystemLog | null> {
    return prisma.systemLog.findUnique({
      where: { id },
    });
  }
}
