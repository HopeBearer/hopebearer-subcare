import { PrismaClient } from "@subcare/database";
import { addMonths, addYears, addWeeks, addDays, isBefore } from "date-fns";

const prisma = new PrismaClient();

async function backfill() {
  console.log("Starting financial backfill...");
  
  const subscriptions = await prisma.subscription.findMany();
  let recordsCreated = 0;

  for (const sub of subscriptions) {
    // 1. Determine frequency
    let addFn = addMonths;

    switch (sub.billingCycle.toLowerCase()) {
        case 'yearly': addFn = addYears; break;
        case 'weekly': addFn = addWeeks; break;
        case 'daily':  addFn = addDays; break;
        case 'monthly': 
        default: addFn = addMonths; break;
    }

    // 2. Iterate from startDate until now
    let currentDate = new Date(sub.startDate);
    const now = new Date();

    while (isBefore(currentDate, now)) {
        // Check if record already exists to avoid duplicates if re-running
        const exists = await prisma.paymentRecord.findFirst({
            where: {
                subscriptionId: sub.id,
                billingDate: currentDate
            }
        });

        // Basic check: only backfill if status is not cancelled OR if it was active at that time
        // For simplicity in this script, we backfill all past dates for current records.
        if (!exists) { 
            await prisma.paymentRecord.create({
                data: {
                    userId: sub.userId,
                    subscriptionId: sub.id,
                    amount: sub.price,
                    currency: sub.currency,
                    billingDate: currentDate,
                    status: 'PAID',
                    note: 'System Backfilled'
                }
            });
            recordsCreated++;
        }
        
        // Move to next cycle
        currentDate = addFn(currentDate, 1);
    }
  }

  console.log(`Backfill complete. Created ${recordsCreated} payment records.`);
}

backfill()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
