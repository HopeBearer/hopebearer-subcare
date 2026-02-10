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
}
