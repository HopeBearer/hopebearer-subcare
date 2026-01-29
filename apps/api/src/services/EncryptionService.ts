import * as crypto from 'crypto';

export class EncryptionService {
  private publicKey: string;
  private privateKey: string;

  constructor() {
    // Generate keys on startup
    // In production, these should ideally be persistent or rotated carefully
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  decrypt(encryptedData: string): string {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        buffer
      );
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }
}
