export class CurrencyService {
  private rates: Record<string, number> = {
    'USD': 1,
    'CNY': 7.23,
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 151.5,
    'HKD': 7.83,
    'TWD': 31.8
  };

  /**
   * Mock implementation that will be replaced by Fixer.io API later.
   * Currently uses hardcoded rates relative to USD.
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const fromRate = this.rates[fromCurrency.toUpperCase()] || 1;
    const toRate = this.rates[toCurrency.toUpperCase()] || 1;

    // Convert to USD first (base), then to target
    const amountInUSD = amount / fromRate;
    const result = amountInUSD * toRate;

    return Number(result.toFixed(2));
  }

  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    return this.convert(1, fromCurrency, toCurrency);
  }
}
