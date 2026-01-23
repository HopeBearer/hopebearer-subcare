import nodemailer from 'nodemailer';
import { EmailProvider } from './email.provider';
import { logger } from '../logger/logger';

export class NodemailerProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const from = process.env.EMAIL_FROM || '"SubCare" <no-reply@subcare.app>';
    
    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      logger.info({
        domain: 'EMAIL',
        action: 'send_success',
        metadata: { 
          messageId: info.messageId,
          to, 
          subject 
        }
      });
    } catch (error) {
      logger.error({
        domain: 'EMAIL',
        action: 'send_fail',
        metadata: { to, subject },
        error
      });
      throw error;
    }
  }
}
