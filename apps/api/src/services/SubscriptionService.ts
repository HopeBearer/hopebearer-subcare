import { SubscriptionRepository } from "../repositories/SubscriptionRepository";
import { CreateSubscriptionDTO, SubscriptionFilterDTO } from "@subcare/types";
import { Subscription } from "@subcare/database";
import { NotificationService } from "../modules/notification/notification.service";
import { calculateNextPayment } from "@subcare/utils";
import { AppError } from "../utils/AppError";
import { StatusCodes } from "http-status-codes";

/**
 * 订阅服务
 * 处理订阅管理相关的业务逻辑
 */
export class SubscriptionService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private notificationService: NotificationService
  ) {}

  /**
   * 创建新订阅
   * @param data 订阅创建数据
   * @returns 创建的订阅实体
   */
  async createSubscription(data: CreateSubscriptionDTO): Promise<Subscription> {
    const nextPayment = calculateNextPayment(data.startDate, data.billingCycle);

    const subscription = await this.subscriptionRepository.create({
      name: data.name,
      price: data.price,
      currency: data.currency,
      billingCycle: data.billingCycle,
      startDate: data.startDate,
      nextPayment: nextPayment,
      status: 'Active',
      category: data.category || 'Other',
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

    await this.notificationService.notify({
      userId: data.userId,
      title: 'New Subscription Added',
      content: `You have successfully added ${data.name} to your subscriptions.`,
      type: 'system',
      channels: ['in-app']
    }).catch(console.error);

    return subscription;
  }

  /**
   * 获取用户的所有订阅
   * @param userId 用户 ID
   * @param filters 过滤参数
   * @returns 订阅列表和总数
   */
  async getUserSubscriptions(userId: string, filters?: SubscriptionFilterDTO): Promise<{ items: Subscription[]; total: number }> {
    return this.subscriptionRepository.findByUserId(userId, filters);
  }

  /**
   * 更新订阅
   * @param id 订阅 ID
   * @param userId 用户 ID (用于验证权限)
   * @param data 更新数据
   * @returns 更新后的订阅
   */
  async updateSubscription(id: string, userId: string, data: Partial<CreateSubscriptionDTO>): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(id);

    if (!subscription) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, { message: 'Subscription not found' });
    }

    if (subscription.userId !== userId) {
      throw new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, { message: 'You do not have permission to update this subscription' });
    }

    // Calculate next payment if start date or cycle changes
    let nextPayment = subscription.nextPayment;
    if (data.startDate || data.billingCycle) {
      const startDate = data.startDate ? new Date(data.startDate) : subscription.startDate;
      const cycle = data.billingCycle || subscription.billingCycle;
      nextPayment = calculateNextPayment(startDate, cycle as any);
    }

    const updatedSubscription = await this.subscriptionRepository.update(id, {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      nextPayment,
      updatedAt: new Date(),
      user: undefined // Prevent user update through this method
    });

    return updatedSubscription;
  }

  /**
   * 删除订阅
   * @param id 订阅 ID
   * @param userId 用户 ID (用于验证权限)
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
   * @returns 包含总订阅数和总流水金额的对象
   */
  async getGlobalStats() {
    const totalSubscriptions = await this.subscriptionRepository.count();
    const totalFlow = await this.subscriptionRepository.sumPrice();
    return { totalSubscriptions, totalFlow };
  }

  /**
   * 获取即将续费的订阅
   * @param userId 用户 ID
   * @param days 天数范围 (默认 7 天)
   * @returns 即将续费的订阅列表
   */
  async getUpcomingRenewals(userId: string, days: number = 7): Promise<Subscription[]> {
    return this.subscriptionRepository.findUpcomingRenewals(userId, days);
  }
}
