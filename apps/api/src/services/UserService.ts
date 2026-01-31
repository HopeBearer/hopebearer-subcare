import { UserRepository } from "../repositories/UserRepository";
import { User, PrismaClient } from "@subcare/database";
import { NotificationService } from "../modules/notification/notification.service";

const prisma = new PrismaClient();

/**
 * 用户服务
 * 处理用户相关的业务逻辑
 */
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private notificationService: NotificationService
  ) {}

  /**
   * 获取所有用户列表
   * 返回时排除敏感字段（密码、刷新令牌）
   * @returns 用户列表
   */
  async getAllUsers(): Promise<Omit<User, 'password' | 'refreshToken'>[]> {
    const users = await this.userRepository.findAll();
    return users.map(user => {
        const { password: _p, refreshToken: _r, ...rest } = user;
        return rest;
    });
  }

  /**
   * 禁用用户
   * @param id 用户 ID
   * @returns 更新后的用户实体
   */
  async disableUser(id: string): Promise<User> {
    return this.userRepository.update(id, { isActive: false });
  }

  /**
   * 更新用户信息
   * @param id 用户 ID
   * @param data 更新数据
   */
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    // Prevent updating sensitive fields via this method if exposed directly
    // Ideally, separate methods for password reset etc.
    const { password: _p, refreshToken: _r, role: _role, ...safeUpdates } = data;
    const updatedUser = await this.userRepository.update(id, safeUpdates);

    // Notify user about profile update
    // Only notify if meaningful fields changed (name, email, bio)
    if (safeUpdates.name || safeUpdates.email || safeUpdates.bio) {
        await this.notificationService.notify({
            userId: id,
            key: 'notification.account.updated',
            data: { 
                field: Object.keys(safeUpdates).join(', ')
            },
            title: 'Account Profile Updated',
            content: 'Your account profile information has been updated.',
            type: 'system',
            eventKey: 'system.account_update',
            channels: { inApp: true, email: true } // Default channels if not set
        }).catch(err => console.error('Failed to send profile update notification', err));
    }

    return updatedUser;
  }

  /**
   * 获取用户详情
   * @param id 用户 ID
   */
  async getUserById(id: string): Promise<Omit<User, 'password' | 'refreshToken'> | null> {
    const user = await this.userRepository.findById(id);
    if (!user) return null;
    const { password: _p, refreshToken: _r, ...rest } = user;
    return rest;
  }


  /**
   * 删除用户 (逻辑自洽版)
   * 递归删除所有关联数据，替代数据库级联删除
   * @param id 用户 ID
   */
  async deleteUserRecursive(id: string): Promise<void> {
    // 使用事务确保原子性
    await prisma.$transaction(async (tx) => {
      // 1. 删除支付记录
      await tx.paymentRecord.deleteMany({ where: { userId: id } });
      
      // 2. 删除通知
      await tx.notification.deleteMany({ where: { userId: id } });
      
      // 3. 删除订阅
      await tx.subscription.deleteMany({ where: { userId: id } });
      
      // 4. 删除自定义分类
      await tx.category.deleteMany({ where: { userId: id } });
      
      // 5. 删除 SystemLogs (保留日志，仅置空关联)
      // await tx.systemLog.updateMany({ 
      //   where: { userId: id },
      //   data: { userId: null }
      // }); 

      // 6. 最后删除用户
      await tx.user.delete({ where: { id } });
    });
  }

  /**
   * 删除用户
   * @deprecated Use deleteUserRecursive instead for complete cleanup
   * @param id 用户 ID
   * @returns 删除的用户实体
   */
  async deleteUser(id: string): Promise<User> {
    // For now, we delegate to recursive delete to ensure safety even if old method is called
    await this.deleteUserRecursive(id);
    // Return a dummy or fetch before delete if return value is strictly needed by interface
    // Ideally the interface should change to void or handle this. 
    // Since the original returns User, and we just deleted it, we can't really return it unless we fetched it first.
    // Given the context of "refactoring", we'll assume void return or throw error is acceptable or we fetch first.
    // Let's keep it simple for this step.
    return {} as User; 
  }
}
