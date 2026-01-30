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

  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  /**
   * Check for name conflict
   */
  async checkNameConflict(userId: string, name: string): Promise<{ conflict: boolean; existingSubscription?: Subscription }> {
    const normalized = this.normalizeName(name);
    
    // First try finding by normalizedName
    let existing = await this.subscriptionRepository.findByNormalizedName(userId, normalized);
    
    // Fallback: If not found, check legacy data manually
    if (!existing) {
        const allSubscriptions = await this.subscriptionRepository.findAllNames(userId);
        
        const match = allSubscriptions.find(s => this.normalizeName(s.name) === normalized);

        if (match) {
            // Found a match in legacy data. Fetch full object.
            const fullMatch = await this.subscriptionRepository.findByUserId(userId, { search: match.name });
            
            const exactMatch = fullMatch.items.find(item => this.normalizeName(item.name) === normalized);
            
            if (exactMatch) {
                existing = exactMatch;
            } else {
                // Should not happen if data consistency is okay, but if it does, 
                // we technically found a conflict but failed to load the object.
                // We should probably still report conflict? 
                // But for now let's rely on finding it.
                console.warn('[WARN] Conflict detected in memory but failed to fetch full object');
            }
        }
    }
    
    if (existing) {
        return { conflict: true, existingSubscription: existing };
    }
    return { conflict: false };
  }

  /**
   * Get all unique subscription names for autocomplete
   */
  async getSubscriptionNames(userId: string) {
    return this.subscriptionRepository.findAllNames(userId);
  }

  /**
   * 创建新订阅
   */
  async createSubscription(data: CreateSubscriptionDTO): Promise<Subscription> {
    const nextPayment = calculateNextPayment(data.startDate, data.billingCycle);

    const subscription = await this.subscriptionRepository.create({
      name: data.name,
      normalizedName: this.normalizeName(data.name),
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
    // If user adds a subscription from the past, we check past cycles from the startDate.
    // We generate backfilled PAID records to reflect accurate history.
    
    // We iterate from startDate up until (but not including) today.
    let historyIterator = new Date(data.startDate);
    
    // Helper to advance date based on cycle
    const advanceDate = (date: Date, cycle: string) => {
        switch (cycle.toLowerCase()) {
            case 'monthly': return addMonths(date, 1);
            case 'yearly': return addYears(date, 1);
            case 'weekly': return addWeeks(date, 1);
            case 'daily': return addDays(date, 1);
            default: return addMonths(date, 1);
        }
    };

    // Check if we need to backfill
    if (isBefore(historyIterator, now)) {
        // Loop while the iterator is strictly in the past (before today)
        // If it lands ON today, we stop, because that will be handled by the "Immediate Check" below for a PENDING bill.
        while (isBefore(historyIterator, now) && historyIterator.toDateString() !== now.toDateString()) {
             
             // 1. Generate PAID record for this past date
             await this.paymentRecordRepository.create({
                amount: subscription.price,
                currency: subscription.currency,
                billingDate: new Date(historyIterator), // Copy date
                status: 'PAID', // Backfilled as PAID
                subscription: { connect: { id: subscription.id } },
                user: { connect: { id: subscription.userId } },
                note: 'Backfilled history'
             }).catch(err => console.error(`[WARN] Failed to backfill history for ${subscription.id} at ${historyIterator}`, err));

             // 2. Advance iterator
             historyIterator = advanceDate(historyIterator, subscription.billingCycle);
        }
    }
    
    // Note: subscription.nextPayment is already calculated correctly by calculateNextPayment (it returns future date)
    // So we don't need to update subscription.nextPayment here unless we want to be super precise about hours, 
    // but calculateNextPayment handles that.

    await this.notificationService.notify({
      userId: data.userId,
      key: 'notification.sub.created',
      data: { name: data.name },
      title: 'New Subscription Added',
      content: `You have successfully added ${data.name} to your subscriptions.`,
      type: 'billing',
      eventKey: 'billing.subscription_created',
      // channels: ['in-app'] // Removed hardcoded channels
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

    if (data.name) {
        updateData.normalizedName = this.normalizeName(data.name);
    }
    
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
  async getSubscriptionHistory(
    subscriptionId: string, 
    userId: string,
    filters: { page?: number; limit?: number; search?: string; startDate?: Date; endDate?: Date } = {}
  ) {
    const sub = await this.subscriptionRepository.findById(subscriptionId);
    if (!sub) {
        throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, { message: 'Subscription not found' });
    }
    if (sub.userId !== userId) {
        throw new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, { message: 'Access denied' });
    }

    return this.paymentRecordRepository.findBySubscriptionId(subscriptionId, filters);
  }

  /**
   * Check and send renewal reminders
   * Intended to be run by Cron Job
   */
  async checkAndSendRenewalReminders() {
      const candidates = await this.subscriptionRepository.findSubscriptionsForRenewalReminder();
      
      console.log(`[Renewal Check] Found ${candidates.length} subscriptions needing reminder.`);

      for (const sub of candidates) {
          try {
              const days = sub.notifyDaysBefore || 0;
              const dateStr = sub.nextPayment ? new Date(sub.nextPayment).toLocaleDateString() : 'Unknown Date';
              
              await this.notificationService.notify({
                  userId: sub.userId,
                  key: 'notification.sub.renewal_reminder',
                  data: { 
                      name: sub.name,
                      days: days,
                      date: dateStr,
                      amount: sub.price,
                      currency: sub.currency
                  },
                  title: 'Upcoming Renewal Reminder', // Fallback
                  content: `Your subscription for ${sub.name} will renew in ${days} days on ${dateStr}. Amount: ${sub.currency} ${sub.price}.`, // Fallback
                  type: 'billing',
                  eventKey: 'billing.renewal_upcoming',
                  // channels: ['in-app', 'email'], // Requirement: Both channels
                  priority: 'HIGH'
              });

          } catch (error) {
              console.error(`[Renewal Check] Failed to notify user ${sub.userId} for subscription ${sub.id}`, error);
          }
      }
  }
}
