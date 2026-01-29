import { prisma, PaymentRecord, Prisma } from "@subcare/database";

export interface PaymentRecordFilter {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

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

  async findBySubscriptionId(
    subscriptionId: string, 
    filter: PaymentRecordFilter = {}
  ): Promise<{ items: PaymentRecord[], total: number, totalAmount: number }> {
    const { page = 1, limit = 20, search, startDate, endDate } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentRecordWhereInput = {
      subscriptionId,
    };

    if (search) {
      where.OR = [
        { note: { contains: search } },
        // Try to search by amount only if it's a valid number string? 
        // Prisma doesn't easily support string search on Decimal/Float columns directly like 'contains'.
        // So we might skip amount search or need raw query. 
        // For simplicity, let's just search 'note' for now.
        // Or if the user really wants amount search, we can filter in memory or check if search is a number.
      ];
    }

    if (startDate || endDate) {
      where.billingDate = {};
      if (startDate) where.billingDate.gte = startDate;
      if (endDate) where.billingDate.lte = endDate;
    }

    const [items, total, aggregate] = await Promise.all([
      prisma.paymentRecord.findMany({
        where,
        orderBy: { billingDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.paymentRecord.count({ where }),
      prisma.paymentRecord.aggregate({
        where,
        _sum: {
          amount: true
        }
      })
    ]);

    return { items, total, totalAmount: Number(aggregate._sum.amount || 0) };
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
