import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      logger.info('Nodemailer SMTP transport initialized');
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<boolean> {
    if (!this.transporter) {
      logger.info(`[Email Simulation] To: ${options.to} | Subject: ${options.subject}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
