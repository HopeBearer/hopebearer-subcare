import { SubscriptionRepository } from "../repositories/SubscriptionRepository";
import { PaymentRecordRepository } from "../repositories/PaymentRecordRepository";
import { addMonths, addYears, addWeeks, addDays } from "date-fns";
import { NotificationService } from "../modules/notification/notification.service";

export class BillGeneratorService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private paymentRecordRepository: PaymentRecordRepository,
    private notificationService: NotificationService
  ) {}

  async generateDailyBills() {
    const dueSubscriptions = await this.subscriptionRepository.findDueSubscriptions();

    let generatedCount = 0;

    for (const sub of dueSubscriptions) {
      const generated = await this.generateBillForSubscription(sub);
      if (generated) {
        generatedCount++;
      }
    }
  }

  /**
   * Check and generate a bill for a specific subscription if it's due.
   * Returns true if a bill was generated.
   */
  async generateBillForSubscription(sub: any): Promise<boolean> {
      // 1. Check if bill already exists for this date
      const existingBill = await this.paymentRecordRepository.findBySubscriptionAndDate(
        sub.id,
        sub.nextPayment
      );

      if (existingBill) {
        // If bill exists (PAID, PENDING, UNPAID), we assume this cycle is handled as far as billing generation is concerned.
        // Since the subscription is still flagged as "due" (nextPayment <= now), 
        // it means we failed to advance the date previously. We should fix it now.
        // BUT: Only advance if the existing bill is PAID. 
        // If it is PENDING, we wait for user.
        // If we are calling this from "confirmPayment", the status just became PAID, so we should advance.
        // Wait, if we call this from confirmPayment, the "nextPayment" has ALREADY been advanced by confirmPayment logic?
        // Let's assume the caller handles the "Advance" logic if it's a confirmation flow.
        // Here we just check "Is there a bill for the CURRENT nextPayment?"
        
        // Actually, for the "Daily Job", if it sees a PAID bill for 'nextPayment', it means 'nextPayment' wasn't advanced.
        // So we advance it.
        if (existingBill.status === 'PAID') {
            await this.advanceSubscriptionDate(sub);
            // After advancing, we should check AGAIN if the NEW nextPayment is due.
            // Recursive call? Or just return false and let the next cycle handle it?
            // For "Catch up" logic, recursive might be better, but safer to let the loop handle it or caller handle it.
            // Let's just advance and return false for now.
            return false;
        }
        
        // If PENDING/UNPAID, do nothing.
        return false;
      }

      // 2. Create new PENDING bill
      await this.paymentRecordRepository.create({
        amount: sub.price,
        currency: sub.currency,
        billingDate: sub.nextPayment,
        status: 'PENDING', // Waiting for user confirmation
        subscription: {
          connect: { id: sub.id }
        },
        user: {
          connect: { id: sub.userId }
        }
      });

      // 3. Notify user
      if (sub.enableNotification) {
          await this.notificationService.notify({
              userId: sub.userId,
              title: 'New Bill Generated',
              content: `A new bill for ${sub.name} is ready for confirmation.`,
              type: 'billing',
              channels: ['in-app'] // or email if implemented
          }).catch(console.error);
      }

      return true;
  }


  // Helper used when we detect a bill already exists but date wasn't advanced
  private async advanceSubscriptionDate(sub: any) {
    let nextPayment = new Date(sub.nextPayment);
    switch (sub.billingCycle.toLowerCase()) {
      case 'monthly':
        nextPayment = addMonths(nextPayment, 1);
        break;
      case 'yearly':
        nextPayment = addYears(nextPayment, 1);
        break;
      case 'weekly':
        nextPayment = addWeeks(nextPayment, 1);
        break;
      case 'daily':
        nextPayment = addDays(nextPayment, 1);
        break;
      default:
        nextPayment = addMonths(nextPayment, 1);
    }

    await this.subscriptionRepository.update(sub.id, {
      nextPayment: nextPayment
    });
  }
}
