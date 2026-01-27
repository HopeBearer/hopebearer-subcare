import { prisma, Subscription, Prisma } from "@subcare/database";
import { SubscriptionFilterDTO } from "@subcare/types";

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
   * @param filters 过滤和分页参数
   * @returns 订阅列表和总数
   */
  async findByUserId(userId: string, filters?: SubscriptionFilterDTO): Promise<{ items: Subscription[]; total: number }> {
    const { search, status, category, billingCycle, page, limit, expiringInDays } = filters || {};
    
    const where: Prisma.SubscriptionWhereInput = {
      userId,
      ...(status && status !== 'All' ? { status: status } : {}), // TODO: Normalize status case if needed
      ...(category && category !== 'All' ? { category } : {}),
      ...(billingCycle && billingCycle !== 'All' ? { billingCycle } : {}),
      ...(search ? {
        name: { contains: search }
      } : {})
    };

    if (expiringInDays) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + expiringInDays);
      futureDate.setHours(23, 59, 59, 999);

      where.nextPayment = {
        gte: today,
        lte: futureDate
      };
      
      // If filtering by expiration, limit to active subscriptions unless specified otherwise
      if (!status || status === 'All') {
          where.status = 'Active';
      }
    }

    const take = limit || undefined;
    const skip = page && limit ? (page - 1) * limit : undefined;

    const [items, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.subscription.count({ where })
    ]);

    return { items, total };
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
   * 删除订阅
   * @param id 订阅 ID
   * @returns 删除的订阅实体
   */
  async delete(id: string): Promise<Subscription> {
    return prisma.subscription.delete({
      where: { id },
    });
  }

  /**
   * 获取订阅总数
   * @returns 订阅数量
   */
  async count(): Promise<number> {
    return prisma.subscription.count();
  }

  /**
   * 查找用户的活跃订阅
   * @param userId 用户 ID
   * @returns 活跃订阅列表
   */
  async findActiveByUserId(userId: string): Promise<Subscription[]> {
    return prisma.subscription.findMany({
      where: { 
        userId,
        status: 'ACTIVE'
      },
      orderBy: { price: 'desc' },
    });
  }

  /**
   * 查找即将续费的订阅
   * @param userId 用户 ID
   * @param days 天数阈值
   * @returns 订阅列表
   */
  async findUpcomingRenewals(userId: string, days: number): Promise<Subscription[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return prisma.subscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        nextPayment: {
          gte: today,
          lte: futureDate
        }
      },
      orderBy: { nextPayment: 'asc' }
    });
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
