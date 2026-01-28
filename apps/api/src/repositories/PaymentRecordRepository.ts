import { prisma, PaymentRecord, Prisma } from "@subcare/database";

export class PaymentRecordRepository {
  async create(data: Prisma.PaymentRecordCreateInput): Promise<PaymentRecord> {
    return prisma.paymentRecord.create({ data });
  }

  async createMany(data: Prisma.PaymentRecordCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return prisma.paymentRecord.createMany({ data });
  }

  async findByUserIdAndDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<PaymentRecord[]> {
    return prisma.paymentRecord.findMany({
      where: {
        userId,
        billingDate: {
          gte: startDate,
          lte: endDate
        },
        status: 'PAID'
      },
      include: {
        subscription: true // Useful for getting subscription details
      },
      orderBy: {
        billingDate: 'desc'
      }
    });
  }

  async findBySubscriptionId(subscriptionId: string): Promise<PaymentRecord[]> {
    return prisma.paymentRecord.findMany({
      where: { subscriptionId },
      orderBy: { billingDate: 'desc' }
    });
  }
  
  /**
   * 分页获取用户的全局账单流水
   * 包含 Subscription 信息以便前端显示
   */
  async findAllByUserId(userId: string, page: number, limit: number): Promise<{ items: PaymentRecord[], total: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.paymentRecord.findMany({
        where: { userId },
        orderBy: { billingDate: 'desc' },
        include: { 
          subscription: true 
        },
        skip,
        take: limit
      }),
      prisma.paymentRecord.count({ where: { userId } })
    ]);
    return { items, total };
  }
  
  async deleteByUserId(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.paymentRecord.deleteMany({
      where: { userId }
    });
  }

  async findBySubscriptionAndDate(subscriptionId: string, billingDate: Date): Promise<PaymentRecord | null> {
    return prisma.paymentRecord.findFirst({
      where: {
        subscriptionId,
        billingDate: billingDate
      }
    });
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    return prisma.paymentRecord.findUnique({
      where: { id }
    });
  }

  async update(id: string, data: Prisma.PaymentRecordUpdateInput): Promise<PaymentRecord> {
    return prisma.paymentRecord.update({
      where: { id },
      data
    });
  }

  async findPendingByUserId(userId: string): Promise<PaymentRecord[]> {
      return prisma.paymentRecord.findMany({
          where: {
              userId,
              status: { in: ['PENDING', 'UNPAID'] }
          },
          include: {
              subscription: true
          },
          orderBy: {
              billingDate: 'asc'
          }
      });
  }
}
