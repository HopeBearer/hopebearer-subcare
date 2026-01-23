import { SubscriptionRepository } from "../repositories/SubscriptionRepository";
import { CreateSubscriptionDTO, SubscriptionFilterDTO } from "@subcare/types";
import { Subscription } from "@subcare/database";
import { NotificationService } from "../modules/notification/notification.service";

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
    const subscription = await this.subscriptionRepository.create({
      name: data.name,
      price: data.price,
      currency: data.currency,
      billingCycle: data.billingCycle,
      startDate: data.startDate,
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
   * 获取全局统计数据
   * @returns 包含总订阅数和总流水金额的对象
   */
  async getGlobalStats() {
    const totalSubscriptions = await this.subscriptionRepository.count();
    const totalFlow = await this.subscriptionRepository.sumPrice();
    return { totalSubscriptions, totalFlow };
  }
}
