import { PrismaClient } from '@subcare/database';

const prisma = new PrismaClient();

export class LoginAttemptRepository {
  /**
   * 根据邮箱查找登录尝试记录
   */
  async findByEmail(email: string) {
    return prisma.loginAttempt.findUnique({ where: { email } });
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
   * 删除最近一次尝试超过指定时间的记录
   */
  async cleanExpired(olderThanMs: number = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - olderThanMs);
    return prisma.loginAttempt.deleteMany({
      where: {
        lastAttemptAt: { lt: cutoff },
      },
    });
  }
}
