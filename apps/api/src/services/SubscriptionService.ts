import { SubscriptionRepository } from "../repositories/SubscriptionRepository";
import { CreateSubscriptionDTO, SubscriptionFilterDTO } from "@subcare/types";
import { Subscription } from "@subcare/database";
import { NotificationService } from "../modules/notification/notification.service";
import { calculateNextPayment } from "@subcare/utils";
import { addMonths, addYears, addWeeks, addDays, isBefore } from "date-fns";
import { AppError } from "../utils/AppError";
import { StatusCodes } from "http-status-codes";
import { PaymentRecordRepository } from "../repositories/PaymentRecordRepository";
import { BillGeneratorService } from "./BillGeneratorService";

/**
 * 订阅服务
 * 处理订阅管理相关的业务逻辑
 */
export class SubscriptionService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private notificationService: NotificationService,
    private paymentRecordRepository: PaymentRecordRepository = new PaymentRecordRepository(),
    private billGeneratorService: BillGeneratorService
  ) {}

  /**
   * 创建新订阅
   */
  async createSubscription(data: CreateSubscriptionDTO): Promise<Subscription> {
    const nextPayment = calculateNextPayment(data.startDate, data.billingCycle);

    const subscription = await this.subscriptionRepository.create({
      name: data.name,
      price: data.price,
      currency: data.currency,
      billingCycle: data.billingCycle,
      startDate: data.startDate,
      nextPayment: nextPayment, // Still save the calculated next payment
      status: 'Active',
      categoryName: data.category || 'Other',
      description: data.description,
      icon: data.icon,
      paymentMethod: data.paymentMethod,
      autoRenewal: data.autoRenewal ?? true,
      enableNotification: data.enableNotification ?? false,
      notifyDaysBefore: data.notifyDaysBefore,
      website: data.website,
      notes: data.notes,
      usage: data.usage || 'Normally',
      user: {
        connect: { id: data.userId }
      }
    });

    const now = new Date();
    
    // Logic Improvement:
    // If user adds a subscription from the past, we assume past cycles are "Done" (implicitly PAID).
    // We do NOT generate backfilled PAID records to avoid dirty data.
    // We only want to generate a PENDING bill if the *next* payment is due NOW (or very soon).
    
    // However, calculateNextPayment usually returns the NEXT valid date from startDate.
    // If startDate is 2020-01-01 and today is 2023-01-01, calculateNextPayment might return 2020-02-01 (if simplistic)
    // or 2023-01-01 (if smart).
    // Let's assume calculateNextPayment is simple (startDate + cycle).
    // So we need to advance the nextPayment to be >= today (or close to today).
    
    // Re-calculate the "Real" Next Payment relative to NOW.
    let realNextPayment = new Date(subscription.nextPayment);
    if (isBefore(realNextPayment, now)) {
        // Loop to advance until it's in the future (or today)
        while (isBefore(realNextPayment, now) && realNextPayment.toDateString() !== now.toDateString()) {
             // Advance logic
             switch (subscription.billingCycle.toLowerCase()) {
                case 'monthly': realNextPayment = addMonths(realNextPayment, 1); break;
                case 'yearly': realNextPayment = addYears(realNextPayment, 1); break;
                case 'weekly': realNextPayment = addWeeks(realNextPayment, 1); break;
                case 'daily': realNextPayment = addDays(realNextPayment, 1); break;
                default: realNextPayment = addMonths(realNextPayment, 1);
            }
        }
        
        // Update the subscription with this new "Real" Next Payment
        await this.subscriptionRepository.update(subscription.id, {
            nextPayment: realNextPayment
        });
        subscription.nextPayment = realNextPayment;
    }

    await this.notificationService.notify({
      userId: data.userId,
      title: 'New Subscription Added',
      content: `You have successfully added ${data.name} to your subscriptions.`,
      type: 'system',
      channels: ['in-app']
    }).catch(console.error);

    // Immediate Check: Now check if this new Real Next Payment is due (e.g. it is Today).
    // If it is today, generate the bill.
    if (subscription.nextPayment && (subscription.nextPayment.toDateString() === now.toDateString())) {
         await this.billGeneratorService.generateBillForSubscription(subscription);
    }

    return {
      ...subscription,
      category: subscription.categoryName
    } as any;
  }

  /**
   * 获取用户的所有订阅
   */
  async getUserSubscriptions(userId: string, filters?: SubscriptionFilterDTO): Promise<{ items: Subscription[]; total: number }> {
    const { items, total } = await this.subscriptionRepository.findByUserId(userId, filters);
    
    // Check for pending bills to flag subscriptions
    let pendingSubIds = new Set<string>();
    try {
        if (this.paymentRecordRepository) {
            const pendingBills = await this.paymentRecordRepository.findPendingByUserId(userId);
            if (pendingBills) {
                 pendingSubIds = new Set(pendingBills.map(b => b.subscriptionId));
            }
        }
    } catch (error) {
        // Fallback: if pending check fails, return items without flag, but log error
        console.error('Failed to fetch pending bills:', error);
    }

    const enrichedItems = items.map(item => ({
        ...item,
        hasPendingBill: pendingSubIds.has(item.id)
    }));

    return { items: enrichedItems as any[], total };
  }

  /**
   * 更新订阅
   */
  async updateSubscription(id: string, userId: string, data: Partial<CreateSubscriptionDTO>): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(id);

    if (!subscription) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, { message: 'Subscription not found' });
    }

    if (subscription.userId !== userId) {
      throw new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, { message: 'You do not have permission to update this subscription' });
    }

    let nextPayment = subscription.nextPayment;
    if (data.startDate || data.billingCycle) {
      const startDate = data.startDate ? new Date(data.startDate) : subscription.startDate;
      const cycle = data.billingCycle || subscription.billingCycle;
      nextPayment = calculateNextPayment(startDate, cycle as any);
    }

    const updateData: any = {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      nextPayment,
      updatedAt: new Date(),
    };
    
    if (data.category) {
        updateData.categoryName = data.category;
        delete updateData.category;
    }

    const updatedSubscription = await this.subscriptionRepository.update(id, updateData);

    return updatedSubscription;
  }

  /**
   * 删除订阅
   */
  async deleteSubscription(id: string, userId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(id);

    if (!subscription) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, { message: 'Subscription not found' });
    }

    if (subscription.userId !== userId) {
      throw new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, { message: 'You do not have permission to delete this subscription' });
    }

    await this.subscriptionRepository.delete(id);
  }

  /**
   * 获取全局统计数据
   */
  async getGlobalStats() {
    const totalSubscriptions = await this.subscriptionRepository.count();
    const totalFlow = await this.subscriptionRepository.sumPrice();
    return { totalSubscriptions, totalFlow };
  }

  /**
   * 获取即将续费的订阅
   */
  async getUpcomingRenewals(userId: string, days: number = 7): Promise<Subscription[]> {
    return this.subscriptionRepository.findUpcomingRenewals(userId, days);
  }

  /**
   * 获取单个订阅的历史流水
   */
  async getSubscriptionHistory(subscriptionId: string, userId: string) {
    const sub = await this.subscriptionRepository.findById(subscriptionId);
    if (!sub) {
        throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, { message: 'Subscription not found' });
    }
    if (sub.userId !== userId) {
        throw new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, { message: 'Access denied' });
    }

    return this.paymentRecordRepository.findBySubscriptionId(subscriptionId);
  }
}
