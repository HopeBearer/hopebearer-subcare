import { prisma, Subscription, Prisma } from "@subcare/database";
import { SubscriptionFilterDTO } from "@subcare/types";

/**
 * 订阅数据仓库
 * 封装对 Subscription 表的所有数据库操作
 */
export class SubscriptionRepository {
  /**
   * 内部辅助方法：获取所有分类的颜色映射
   */
  private async getCategoryColorMap(): Promise<Map<string, string>> {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      select: { name: true, color: true }
    });
    const colorMap = new Map<string, string>();
    categories.forEach(cat => {
      colorMap.set(cat.name.toLowerCase(), cat.color || '#9CA3AF');
    });
    return colorMap;
  }

  /**
   * 内部辅助方法：为订阅添加颜色信息
   */
  private addCategoryColor(item: any, colorMap: Map<string, string>): any {
    const categoryName = item.category?.name || item.categoryName || 'Other';
    return {
      ...item,
      category: categoryName,
      categoryColor: item.category?.color || colorMap.get(categoryName.toLowerCase()) || '#9CA3AF'
    };
  }

  /**
   * Check if a subscription with the same normalized name exists for the user
   */
  async findByNormalizedName(userId: string, normalizedName: string): Promise<Subscription | null> {
    return prisma.subscription.findFirst({
      where: {
        userId,
        normalizedName
      }
    });
  }

  /**
   * Find all subscription names for a user (for autocomplete)
   * Modified to perform unique filtering in application code to handle legacy data where normalizedName might be empty
   */
  async findAllNames(userId: string): Promise<{ name: string, icon: string | null }[]> {
    const items = await prisma.subscription.findMany({
      where: { userId },
      select: { name: true, icon: true }, 
    });

    // Application-level distinct by normalized name
    const seen = new Set<string>();
    const uniqueItems: { name: string, icon: string | null }[] = [];

    for (const item of items) {
        if (!item.name) continue; 
        const normalized = item.name.trim().toLowerCase();
        if (!seen.has(normalized)) {
            seen.add(normalized);
            uniqueItems.push(item);
        }
    }
    
    return uniqueItems;
  }

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
  async findByUserId(userId: string, filters?: SubscriptionFilterDTO): Promise<{ items: any[]; total: number }> {
    const { search, status, category, billingCycle, page, limit, expiringInDays } = filters || {};
    
    const where: Prisma.SubscriptionWhereInput = {
      userId,
      ...(status && status !== 'All' ? { status: status } : {}),
      ...(billingCycle && billingCycle !== 'All' ? { billingCycle } : {}),
      ...(search ? {
        name: { contains: search }
      } : {})
    };

    // 支持通过分类名称或分类ID过滤
    if (category && category !== 'All') {
      where.OR = [
        { categoryName: category },
        { category: { name: category } }
      ];
    }

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
      
      if (!status || status === 'All') {
          where.status = 'Active';
      }
    }

    const take = limit || undefined;
    const skip = page && limit ? (page - 1) * limit : undefined;

    try {
      const [items, total, colorMap] = await Promise.all([
        prisma.subscription.findMany({
          where,
          include: {
            category: true // 关联查询分类
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.subscription.count({ where }),
        this.getCategoryColorMap()
      ]);

      // MAP: 优先使用关联的分类，其次使用旧的 categoryName 字段
      const mappedItems = items.map(item => this.addCategoryColor(item, colorMap));

      return { items: mappedItems, total };
    } catch (error) {
      console.error('Error in SubscriptionRepository.findByUserId:', error);
      throw error;
    }
  }

  /**
   * 根据 ID 查找订阅
   * @param id 订阅 ID
   * @returns 订阅实体或 null
   */
  async findById(id: string): Promise<any | null> {
    const item = await prisma.subscription.findUnique({
      where: { id },
      include: {
        category: true
      }
    });
    if (!item) return null;
    
    const colorMap = await this.getCategoryColorMap();
    return this.addCategoryColor(item, colorMap);
  }
  
  /**
   * 更新订阅信息
   * @param id 订阅 ID
   * @param data 更新数据
   * @returns 更新后的订阅实体
   */
  async update(id: string, data: Prisma.SubscriptionUpdateInput): Promise<any> {
    const item = await prisma.subscription.update({
        where: { id },
        data,
        include: {
          category: true
        }
    });
    
    const colorMap = await this.getCategoryColorMap();
    return this.addCategoryColor(item, colorMap);
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
  async findActiveByUserId(userId: string): Promise<any[]> {
    const [items, colorMap] = await Promise.all([
      prisma.subscription.findMany({
        where: { 
          userId,
          status: 'ACTIVE'
        },
        include: {
          category: true
        },
        orderBy: { price: 'desc' },
      }),
      this.getCategoryColorMap()
    ]);
    return items.map(item => this.addCategoryColor(item, colorMap));
  }

  /**
   * 查找即将续费的订阅
   * @param userId 用户 ID
   * @param days 天数阈值
   * @returns 订阅列表
   */
  async findUpcomingRenewals(userId: string, days: number): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day to include items due today
    
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    futureDate.setHours(23, 59, 59, 999); // Set to end of the target day

    const [items, colorMap] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          nextPayment: {
            gte: today,
            lte: futureDate
          }
        },
        include: {
          category: true
        },
        orderBy: { nextPayment: 'asc' }
      }),
      this.getCategoryColorMap()
    ]);
    
    return items.map(item => this.addCategoryColor(item, colorMap));
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

  /**
   * Find due subscriptions (active and nextPayment <= now)
   */
  async findDueSubscriptions(): Promise<any[]> {
    const now = new Date();
    const items = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextPayment: {
          lte: now
        }
      }
    });
    return items.map(item => ({
        ...item,
        category: item.categoryName
    }));
  }

  /**
   * Find subscriptions that need renewal reminders
   * Logic: 
   * - Status is ACTIVE
   * - notification enabled
   * - notifyDaysBefore is set
   * - nextPayment matches the reminder date (Today + notifyDaysBefore)
   */
  async findSubscriptionsForRenewalReminder(): Promise<any[]> {
     // We need to find subscriptions where:
     // nextPayment DATE == (Today + notifyDaysBefore) DATE
     // Since Prisma doesn't support complex field arithmetic in where clause easily without raw query,
     // we might need to fetch potential candidates or use raw query.
     // Or, simpler: we fetch all active subscriptions with notifications enabled, 
     // and filter in code. Given user base size, this is safer than complex raw SQL for now.
     // Alternatively, we can assume a max limit of days (e.g. 30) and fetch only those in that range.

     const today = new Date();
     const maxFuture = new Date();
     maxFuture.setDate(today.getDate() + 31); // Look ahead 31 days max

     const candidates = await prisma.subscription.findMany({
        where: {
            status: 'ACTIVE',
            enableNotification: true,
            notifyDaysBefore: { gt: 0 },
            nextPayment: {
                gte: today,
                lte: maxFuture
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true
                }
            }
        }
     });

     // Now filter in memory for exact match
     // date(nextPayment) == date(today + notifyDaysBefore)
     const reminders = candidates.filter(sub => {
         if (!sub.nextPayment || !sub.notifyDaysBefore) return false;
         
         const targetDate = new Date();
         targetDate.setDate(today.getDate() + sub.notifyDaysBefore);
         
         return sub.nextPayment.toDateString() === targetDate.toDateString();
     });

     return reminders.map(item => ({
        ...item,
        category: item.categoryName
     }));
  }
}
