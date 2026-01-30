import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.APP_SECRET || 'default_secret_key_must_be_32_bytes_long!!'; // Must be 32 chars
const IV_LENGTH = 16; // For AES, this is always 16

export class EncryptionUtil {
  
  // Helper to ensure key is 32 bytes
  private static getKey(): Buffer {
    return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  }

  static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.getKey(), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  static decrypt(text: string): string {
    const textParts = text.split(':');
    if (textParts.length < 2) throw new Error('Invalid encrypted text format');
    
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.getKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
