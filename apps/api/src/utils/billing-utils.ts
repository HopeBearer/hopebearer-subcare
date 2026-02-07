export const calculateMonthlyEquivalent = (price: number, cycle: string): number => {
  switch (cycle.toLowerCase()) {
    case 'yearly':
    case 'year':
    case 'annual':
      return price / 12;
    case 'weekly':
    case 'week':
      return price * 4.33;
    case 'daily':
    case 'day':
      return price * 30;
    case 'monthly':
    case 'month':
    default:
      return price;
  }
};
