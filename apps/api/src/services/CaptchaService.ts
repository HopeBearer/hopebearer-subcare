import * as svgCaptcha from 'svg-captcha';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

interface CaptchaData {
  text: string;
  expiresAt: number;
}

export class CaptchaService {
  // In a real production app, use Redis. For now, in-memory map is fine for a single instance.
  // Map<captchaId, CaptchaData>
  private static store = new Map<string, CaptchaData>();
  
  // Cleanup expired captchas every 5 minutes
  private static cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, data] of CaptchaService.store.entries()) {
      if (data.expiresAt < now) {
        CaptchaService.store.delete(id);
      }
    }
  }, 5 * 60 * 1000);

  /**
   * Generate a new captcha
   * @returns object containing captchaId and svg image data
   */
  generate(): { captchaId: string; data: string } {
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1i', // avoid confusion
      noise: 2,
      color: true,
      background: '#f0f0f0',
      width: 120,
      height: 40,
    });

    const captchaId = uuidv4();
    
    // Store captcha text with expiration (e.g., 5 minutes)
    CaptchaService.store.set(captchaId, {
      text: captcha.text.toLowerCase(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return {
      captchaId,
      data: captcha.data,
    };
  }

  /**
   * Verify a captcha code
   * @param captchaId The unique ID of the captcha
   * @param code The code entered by the user
   * @returns boolean indicating validity
   */
  verify(captchaId: string, code: string): boolean {
    const data = CaptchaService.store.get(captchaId);
    
    if (!data) {
        return false;
    }

    // Check expiration
    if (Date.now() > data.expiresAt) {
      CaptchaService.store.delete(captchaId);
      return false;
    }

    // Verify code (case insensitive)
    const isValid = data.text === code.toLowerCase();
    
    // Invalidate captcha after use (whether valid or invalid to prevent replay)
    CaptchaService.store.delete(captchaId);

    return isValid;
  }
}
