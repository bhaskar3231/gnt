/**
 * Payment Service
 * Abstraction layer for payment provider (Razorpay)
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

if (!razorpayKeyId || !razorpayKeySecret) {
  console.warn('Razorpay credentials not fully configured');
}

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

export interface CreateOrderParams {
  amount: number; // in paise
  currency?: string;
  receipt: string;
  description?: string;
  notes?: Record<string, string>;
}

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface WebhookVerification {
  isValid: boolean;
  data?: Record<string, unknown>;
}

export class PaymentService {
  /**
   * Create a payment order
   */
  static async createOrder(
    params: CreateOrderParams
  ): Promise<PaymentOrder> {
    try {
      const orderParams: any = {
        amount: Math.floor(params.amount),
        currency: params.currency || 'INR',
        receipt: params.receipt,
      };

      if (params.description) {
        orderParams.description = params.description;
      }

      if (params.notes) {
        orderParams.notes = params.notes;
      }

      const order = await razorpay.orders.create(orderParams);

      return {
        id: order.id as string,
        amount: order.amount as number,
        currency: order.currency as string,
        receipt: order.receipt as string,
        status: order.status as string,
      };
    } catch (error) {
      console.error('Payment order creation error:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature from webhook
   */
  static verifyWebhookSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): boolean {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || razorpayKeySecret;
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      return expectedSignature === razorpaySignature;
    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }

  /**
   * Verify payment signature from checkout
   */
  static verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): boolean {
    return this.verifyWebhookSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );
  }

  /**
   * Capture payment
   */
  static async capturePayment(
    paymentId: string,
    amount: number
  ): Promise<Record<string, unknown>> {
    try {
      const payment = await razorpay.payments.capture(
        paymentId,
        Math.floor(amount),
        'INR'
      );
      return payment as unknown as Record<string, unknown>;
    } catch (error) {
      console.error('Payment capture error:', error);
      throw error;
    }
  }

  /**
   * Refund payment
   */
  static async refundPayment(
    paymentId: string,
    amount?: number
  ): Promise<Record<string, unknown>> {
    try {
      const refundParams: Record<string, unknown> = {};
      if (amount) {
        refundParams.amount = Math.floor(amount);
      }

      const refund = await razorpay.payments.refund(paymentId, refundParams);
      return refund as unknown as Record<string, unknown>;
    } catch (error) {
      console.error('Payment refund error:', error);
      throw error;
    }
  }
}