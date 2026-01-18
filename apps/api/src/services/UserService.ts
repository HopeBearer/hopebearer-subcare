import { UserRepository } from "../repositories/UserRepository";
import { User } from "@subcare/database";

/**
 * 用户服务
 * 处理用户相关的业务逻辑
 */
export class UserService {
  constructor(private userRepository: UserRepository) {}

  /**
   * 获取所有用户列表
   * 返回时排除敏感字段（密码、刷新令牌）
   * @returns 用户列表
   */
  async getAllUsers(): Promise<Omit<User, 'password' | 'refreshToken'>[]> {
    const users = await this.userRepository.findAll();
    return users.map(user => {
        const { password, refreshToken, ...rest } = user;
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
   * 删除用户
   * @param id 用户 ID
   * @returns 删除的用户实体
   */
  async deleteUser(id: string): Promise<User> {
    return this.userRepository.delete(id);
  }
}
