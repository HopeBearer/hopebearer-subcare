import { LoginAttemptRepository } from '../repositories/LoginAttemptRepository';
import { SystemLogRepository } from '../repositories/SystemLogRepository';

export class LoginAttemptService {
  constructor(
    private loginAttemptRepository: LoginAttemptRepository,
    private systemLogRepository: SystemLogRepository
  ) {}

  /**
   * 分页获取登录尝试列表
   */
  async getList(options: { page?: number; limit?: number; status?: string; email?: string }) {
    const { page = 1, limit = 20, status = 'all', email } = options;
    const result = await this.loginAttemptRepository.findAll({
      page,
      limit,
      status: status as 'all' | 'frozen' | 'expired',
      email,
    });

    const now = Date.now();
    const items = result.items.map((item) => ({
      ...item,
      isFrozen: item.lockedUntil ? item.lockedUntil.getTime() > now : false,
      remainingSeconds: item.lockedUntil && item.lockedUntil.getTime() > now
        ? Math.ceil((item.lockedUntil.getTime() - now) / 1000)
        : 0,
    }));

    return {
      items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * 手动解冻（删除记录）
   */
  async unfreeze(id: string, adminUserId?: string) {
    await this.loginAttemptRepository.deleteById(id);

    // 写入审计日志
    await this.systemLogRepository.create({
      level: 'AUDIT',
      domain: 'SECURITY',
      action: 'unfreeze_login_attempt',
      userId: adminUserId || null,
      metadata: { loginAttemptId: id },
    });
  }

  /**
   * 批量清理过期记录
   */
  async cleanExpired(adminUserId?: string) {
    const result = await this.loginAttemptRepository.cleanExpired();

    // 写入审计日志
    await this.systemLogRepository.create({
      level: 'AUDIT',
      domain: 'SECURITY',
      action: 'clean_expired_login_attempts',
      userId: adminUserId || null,
      metadata: { cleaned: result.count },
    });

    return { cleaned: result.count };
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    return this.loginAttemptRepository.getStats();
  }
}
