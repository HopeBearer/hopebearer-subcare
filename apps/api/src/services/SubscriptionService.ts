import { SubscriptionRepository } from "../repositories/SubscriptionRepository";
import { CreateSubscriptionDTO } from "@subcare/types";
import { Subscription } from "@subcare/database";

/**
 * 订阅服务
 * 处理订阅管理相关的业务逻辑
 */
export class SubscriptionService {
  constructor(private subscriptionRepository: SubscriptionRepository) {}

  /**
   * 创建新订阅
   * @param data 订阅创建数据
   * @returns 创建的订阅实体
   */
  async createSubscription(data: CreateSubscriptionDTO): Promise<Subscription> {
    return this.subscriptionRepository.create({
      name: data.name,
      price: data.price,
      currency: data.currency,
      billingCycle: data.billingCycle,
      startDate: data.startDate,
      status: 'ACTIVE', // 默认为激活状态
      user: {
        connect: { id: data.userId }
      }
    });
  }

  /**
   * 获取用户的所有订阅
   * @param userId 用户 ID
   * @returns 订阅列表
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.findByUserId(userId);
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
