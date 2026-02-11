import { PrismaClient, Prisma } from '@subcare/database';

const prisma = new PrismaClient();

export interface LoginAttemptFindAllOptions {
  page?: number;
  limit?: number;
  status?: 'all' | 'frozen' | 'expired';
  email?: string;
}

export class LoginAttemptRepository {
  /**
   * 根据邮箱查找登录尝试记录
   */
  async findByEmail(email: string) {
    return prisma.loginAttempt.findUnique({ where: { email } });
  }

  /**
   * 分页查询所有登录尝试记录（管理端）
   */
  async findAll(options: LoginAttemptFindAllOptions = {}) {
    const { page = 1, limit = 20, status, email } = options;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.LoginAttemptWhereInput = {};

    // 邮箱模糊搜索
    if (email) {
      where.email = { contains: email };
    }

    // 状态筛选
    if (status === 'frozen') {
      where.lockedUntil = { gt: now };
    } else if (status === 'expired') {
      where.OR = [
        { lockedUntil: null },
        { lockedUntil: { lte: now } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.loginAttempt.findMany({
        where,
        orderBy: { lastAttemptAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loginAttempt.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 根据 ID 删除（解冻）
   */
  async deleteById(id: string) {
    return prisma.loginAttempt.delete({ where: { id } });
  }

  /**
   * 更新或创建登录尝试记录
   * @param email 邮箱
   * @param count 失败次数
   * @param lockedUntil 冻结截止时间
   */
  async upsert(email: string, count: number, lockedUntil: Date | null) {
    return prisma.loginAttempt.upsert({
      where: { email },
      create: {
        email,
        count,
        lockedUntil,
        lastAttemptAt: new Date(),
      },
      update: {
        count,
        lockedUntil,
        lastAttemptAt: new Date(),
      },
    });
  }

  /**
   * 登录成功 / 修改密码后清除该邮箱的失败记录
   */
  async deleteByEmail(email: string) {
    return prisma.loginAttempt.deleteMany({ where: { email } });
  }

  /**
   * 清理已过期的记录（可由定时任务调用）
   * 删除最近一次尝试超过指定时间且未处于冻结状态的记录
   */
  async cleanExpired(olderThanMs: number = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - olderThanMs);
    const now = new Date();
    return prisma.loginAttempt.deleteMany({
      where: {
        lastAttemptAt: { lt: cutoff },
        OR: [
          { lockedUntil: null },
          { lockedUntil: { lte: now } },
        ],
      },
    });
  }

  /**
   * 获取统计数据
   */
  async getStats() {
    const now = new Date();
    const [total, frozenCount] = await Promise.all([
      prisma.loginAttempt.count(),
      prisma.loginAttempt.count({
        where: { lockedUntil: { gt: now } },
      }),
    ]);
    return { total, frozenCount };
  }
}
