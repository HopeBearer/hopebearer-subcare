import { logger } from '../infrastructure/logger/logger';

interface VerificationData {
  code: string;
  expiresAt: number;
}

export class VerificationCodeService {
  // In a real production app, use Redis.
  private static store = new Map<string, VerificationData>();

  /**
   * Generate a generic verification code (6 digits)
   * @param key Unique key (e.g., email)
   * @param ttl Time to live in ms (default 5 mins)
   */
  generate(key: string, ttl: number = 5 * 60 * 1000): string {
    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    VerificationCodeService.store.set(key, {
      code,
      expiresAt: Date.now() + ttl,
    });

    logger.info({
      domain: 'AUTH',
      action: 'generate_verification_code',
      metadata: { key }
    });

    return code;
  }

  /**
   * Verify the code
   * @param key Unique key (e.g., email)
   * @param code Code to verify
   */
  verify(key: string, code: string): boolean {
    const data = VerificationCodeService.store.get(key);

    if (!data) {
      return false;
    }

    if (Date.now() > data.expiresAt) {
      VerificationCodeService.store.delete(key);
      return false;
    }

    const isValid = data.code === code;
    
    if (isValid) {
      VerificationCodeService.store.delete(key);
    }

    return isValid;
  }
}
