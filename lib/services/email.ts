/**
 * Email Service
 * Abstraction layer for email provider (Resend)
 */

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error('Resend API key not configured');
}

const resend = new Resend(resendApiKey);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export class EmailService {
  private static readonly DEFAULT_FROM = 'noreply@giftandtreat.com';

  /**
   * Send email
   */
  static async sendEmail(options: EmailOptions): Promise<{ id: string }> {
    try {
      const response = await resend.emails.send({
        from: options.from || this.DEFAULT_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        ...(options.replyTo && { reply_to: options.replyTo }),
      });

      if (response.error) {
        throw new Error(`Email send failed: ${response.error.message}`);
      }

      return {
        id: response.data?.id || '',
      };
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmation(
    email: string,
    orderNumber: string,
    orderData: Record<string, unknown>
  ): Promise<{ id: string }> {
    const html = this.buildOrderConfirmationEmail(orderNumber, orderData);
    return this.sendEmail({
      to: email,
      subject: `Order Confirmation - #${orderNumber}`,
      html,
    });
  }

  /**
   * Send order shipped email
   */
  static async sendOrderShipped(
    email: string,
    orderNumber: string,
    trackingInfo?: Record<string, unknown>
  ): Promise<{ id: string }> {
    const html = this.buildOrderShippedEmail(orderNumber, trackingInfo);
    return this.sendEmail({
      to: email,
      subject: `Your order #${orderNumber} has been shipped`,
      html,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(
    email: string,
    resetLink: string
  ): Promise<{ id: string }> {
    const html = `
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 24 hours.</p>
    `;
    return this.sendEmail({
      to: email,
      subject: 'Password Reset - Gift & Treat',
      html,
    });
  }

  private static buildOrderConfirmationEmail(
    orderNumber: string,
    _orderData: Record<string, unknown>
  ): string {
    return `
      <h2>Order Confirmation</h2>
      <p>Thank you for your order!</p>
      <p>Order Number: <strong>#${orderNumber}</strong></p>
      <p>We'll notify you when your order ships.</p>
    `;
  }

  private static buildOrderShippedEmail(
    orderNumber: string,
    _trackingInfo?: Record<string, unknown>
  ): string {
    return `
      <h2>Order Shipped</h2>
      <p>Your order <strong>#${orderNumber}</strong> has been shipped.</p>
      <p>You can track your order using the tracking details in your account.</p>
    `;
  }
}