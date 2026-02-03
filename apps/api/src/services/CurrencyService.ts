import axios from 'axios';
import { ExchangeRateRepository } from '../repositories/ExchangeRateRepository';
import { StatusCodes } from 'http-status-codes';

export class CurrencyService {
  private readonly FIXER_API_KEY = process.env.FIXER_API_KEY;
  private readonly BASE_URL = 'http://data.fixer.io/api';

  // Default fallback rates (relative to EUR as base)
  private rates: Record<string, number> = {
    'EUR': 1,
    'USD': 1.08,
    'CNY': 7.8,
    'GBP': 0.85,
    'JPY': 163.5,
    'HKD': 8.45,
    'TWD': 34.5,
    'SGD': 1.45,
    'AUD': 1.65,
    'CAD': 1.47,
    'CHF': 0.95
  };

  private repository: ExchangeRateRepository | null = null;

  // Utilize setter injection or method check to avoid breaking existing constructor calls immediately if DI is complex
  // But ideally we should update container.ts to inject it.
  // For now, I will modify the constructor if allowed, or add a setter.
  // Looking at container.ts, we can update the constructor.

  constructor(repository?: ExchangeRateRepository) {
    if (repository) {
      this.repository = repository;
      // Load initial rates from DB if possible (async init pattern or just lazy load)
    }
  }

  /**
   * Set repository manually if not injected in constructor (for backward compat during migration)
   */
  setRepository(repo: ExchangeRateRepository) {
    this.repository = repo;
  }

  /**
   * Sync rates from Fixer.io
   */
  async syncRates() {
    if (!this.FIXER_API_KEY) {
      console.warn('FIXER_API_KEY is not set. Skipping sync.');
      return;
    }

    try {
      // Fixer Free Plan only supports base=EUR
      const response = await axios.get(`${this.BASE_URL}/latest`, {
        params: {
          access_key: this.FIXER_API_KEY,
          // symbols: 'USD,CNY,EUR,GBP,JPY,HKD,SGD,AUD,CAD,CHF' // Fetch all or specific
        }
      });

      if (!response.data.success) {
        throw new Error(`Fixer API Error: ${response.data.error?.type || 'Unknown error'}`);
      }

      const rates = response.data.rates;
      const ratesToSave = Object.entries(rates).map(([currency, rate]) => ({
        currency,
        rate: Number(rate),
        base: 'EUR'
      }));

      // Update local memory cache
      this.rates = { ...this.rates, ...rates };

      // Save to DB
      if (this.repository) {
        await this.repository.upsertRates(ratesToSave);
      }

      console.log(`Successfully synced ${ratesToSave.length} currency rates.`);
    } catch (error) {
      console.error('Failed to sync currency rates:', error);
      // Don't crash the app, just log error
    }
  }

  /**
   * Convert amount between currencies
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    // Ensure we have the latest rates (maybe check cache expiry? for now keep simple)
    // If repository exists, we could try to refresh from it if memory is empty, 
    // but for performance, we keep rates in memory and rely on sync job to update them.

    // Check if we need to load from DB explicitly? 
    // If the service restarts, memory is empty (except defaults).
    // We should load from DB on startup.

    // Normalizing currencies
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) return amount;

    // Get rates (relative to EUR)
    const fromRate = await this.getRateValue(from);
    const toRate = await this.getRateValue(to);

    if (!fromRate || !toRate) {
      console.warn(`Missing rate for conversion: ${from} -> ${to}. Using fallback 1:1`);
      return amount;
      // Or throw error:
      // throw new AppError(StatusCodes.BAD_REQUEST, `Unsupported currency: ${!fromRate ? from : to}`);
    }

    // Convert: Amount / FromRate * ToRate
    // Example: 100 USD -> ? CNY
    // 100 / Rate(USD/EUR) * Rate(CNY/EUR)
    // 100 / 1.08 * 7.8 = 92.59 EUR * 7.8 ??? NO.
    // 1 EUR = 1.08 USD  => 1 USD = 1/1.08 EUR.
    // 1 EUR = 7.8 CNY.
    // 100 USD = 100 * (1/1.08) EUR = 92.59 EUR
    // 92.59 EUR = 92.59 * 7.8 CNY = 722.22 CNY

    // Wait, Fixer returns: "rates": { "USD": 1.08 } means 1 EUR = 1.08 USD.
    // So logic: AmountInEUR = AmountInFrom / RateFrom
    // ResultInTo = AmountInEUR * RateTo

    const amountInEUR = amount / fromRate;
    const result = amountInEUR * toRate;

    return Number(result.toFixed(2));
  }

  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    return this.convert(1, fromCurrency, toCurrency);
  }

  /**
   * Get supported currencies list
   */
  async getSupportedCurrencies() {
    // If we have a repository, ensure we have initial data
    if (this.repository && Object.keys(this.rates).length <= 11) {
      try {
        const dbRates = await this.repository.findAll();
        if (dbRates.length > 0) {
          dbRates.forEach(r => {
            this.rates[r.currency] = Number(r.rate);
          });
        }
      } catch (error) {
        console.warn('Failed to load rates from DB:', error);
        // Fallback to defaults (already in this.rates)
      }
    }
    return Object.keys(this.rates);
  }

  // Internal helper to get rate with fallback to DB
  private async getRateValue(currency: string): Promise<number | undefined> {
    if (this.rates[currency]) {
      return this.rates[currency];
    }

    // Try DB if not in memory
    if (this.repository) {
      const dbRate = await this.repository.findByCurrency(currency);
      if (dbRate) {
        this.rates[currency] = Number(dbRate.rate);
        return Number(dbRate.rate);
      }
    }

    return undefined;
  }
}
