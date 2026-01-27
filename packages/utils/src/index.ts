/**
 * Calculates the next payment date based on the start date and billing cycle.
 * If the start date is in the future, it is returned as the next payment date.
 * If the start date is in the past, it calculates the next occurrence relative to now.
 * 
 * @param startDate The start date of the subscription
 * @param billingCycle The billing cycle ('Monthly' | 'Yearly')
 * @returns The next payment date
 */
export function calculateNextPayment(startDate: Date | string, billingCycle: string): Date {
  const now = new Date();
  // Reset time to start of day for accurate date comparison
  now.setHours(0, 0, 0, 0);
  
  let nextPayment = new Date(startDate);
  // Reset time to start of day
  nextPayment.setHours(0, 0, 0, 0);

  // If start date is in the future (or today), that's the next payment
  // Actually, if it's today, usually we consider it paid? 
  // If I subscribe today, I pay today. The *next* payment is next month.
  // So if nextPayment <= now, we need to add a cycle.
  
  if (nextPayment > now) {
    return nextPayment;
  }

  // If start date is in the past or today, calculate the next occurrence
  let iterations = 0;
  // We want the first date strictly greater than now? 
  // Or if today is the payment date, and I already paid, then next is next month.
  // If I haven't paid today yet, then today is the payment date.
  // Usually "Next Payment" implies the one coming up.
  // If I paid today, the next one is in the future.
  
  while (nextPayment <= now && iterations < 1000) {
    if (billingCycle === 'Monthly') {
      nextPayment.setMonth(nextPayment.getMonth() + 1);
    } else if (billingCycle === 'Yearly') {
      nextPayment.setFullYear(nextPayment.getFullYear() + 1);
    } else {
      // Default to monthly if unknown
      nextPayment.setMonth(nextPayment.getMonth() + 1); 
    }
    iterations++;
  }
  return nextPayment;
}
