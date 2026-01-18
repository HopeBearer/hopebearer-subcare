import { prisma, Subscription, Prisma } from "@subcare/database";

/**
 * 订阅数据仓库
 * 封装对 Subscription 表的所有数据库操作
 */
export class SubscriptionRepository {
  /**
   * 创建新的订阅
   * @param data 订阅创建数据
   * @returns 创建的订阅实体
   */
  async create(data: Prisma.SubscriptionCreateInput): Promise<Subscription> {
    return prisma.subscription.create({
      data,
    });
  }

  /**
   * 查找用户的订阅列表
   * @param userId 用户 ID
   * @returns 订阅列表，按创建时间倒序排列
   */
  async findByUserId(userId: string): Promise<Subscription[]> {
    return prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 根据 ID 查找订阅
   * @param id 订阅 ID
   * @returns 订阅实体或 null
   */
  async findById(id: string): Promise<Subscription | null> {
    return prisma.subscription.findUnique({
      where: { id },
    });
  }
  
  /**
   * 更新订阅信息
   * @param id 订阅 ID
   * @param data 更新数据
   * @returns 更新后的订阅实体
   */
  async update(id: string, data: Prisma.SubscriptionUpdateInput): Promise<Subscription> {
    return prisma.subscription.update({
        where: { id },
        data
    })
  }

  /**
   * 获取订阅总数
   * @returns 订阅数量
   */
  async count(): Promise<number> {
    return prisma.subscription.count();
  }

  /**
   * 计算订阅总金额
   * @returns 总金额
   */
  async sumPrice(): Promise<number> {
    const result = await prisma.subscription.aggregate({
      _sum: {
        price: true,
      },
    });
    return result._sum.price?.toNumber() || 0;
  }
}
