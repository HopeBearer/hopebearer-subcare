import { prisma, User, Prisma } from "@subcare/database";

/**
 * 用户数据仓库
 * 封装对 User 表的所有数据库操作
 */
export class UserRepository {
  /**
   * 创建新用户
   * @param data 用户创建数据
   * @returns 创建的用户实体
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * 根据邮箱查找用户
   * @param email 用户邮箱
   * @returns 用户实体或 null
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * 根据 ID 查找用户
   * @param id 用户 ID
   * @returns 用户实体或 null
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * 更新用户信息
   * @param id 用户 ID
   * @param data 更新数据
   * @returns 更新后的用户实体
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * 查找所有用户
   * @returns 用户列表
   */
  async findAll(): Promise<User[]> {
    return prisma.user.findMany();
  }

  /**
   * 删除用户
   * @param id 用户 ID
   * @returns 删除的用户实体
   */
  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }
}
