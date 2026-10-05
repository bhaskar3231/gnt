import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { PaymentService } from '@/lib/services/payment';
import { OrderService } from '@/lib/services/OrderService';
import { EmailService } from '@/lib/services/email';
import { ApiResponse } from '@/types';

/**
 * POST /api/payment/razorpay-webhook
 * Handle Razorpay webhook events
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    await dbConnect();

    const body = await request.json();
    const { event, payload } = body;

    // Verify webhook signature
    const razorpaySignature = request.headers.get('x-razorpay-signature') || '';
    const isValid = PaymentService.verifyWebhookSignature(
      payload.payment?.id || '',
      payload.payment?.order_id || '',
      razorpaySignature
    );

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid webhook signature',
        },
        { status: 401 }
      );
    }

    switch (event) {
      case 'payment.authorized':
        // Capture the payment
        await PaymentService.capturePayment(
          payload.payment.id,
          payload.payment.amount
        );

        // Update order payment status
        const orderId = payload.payment.notes?.orderId;
        if (orderId) {
          await OrderService.updatePaymentStatus(
            orderId,
            'COMPLETED',
            payload.payment.order_id,
            payload.payment.id
          );

          // Send confirmation email
          const order = await OrderService.getOrderById(orderId);
          if (order) {
            const user = await import('@/models/User').then(m => m.User.findById(order.customerId));
            if (user?.email) {
              await EmailService.sendOrderConfirmation(
                user.email,
                order.orderNumber,
                order.toObject ? order.toObject() : order
              );
            }
          }
        }
        break;

      case 'payment.failed':
        // Update order payment status to failed
        const failedOrderId = payload.payment.notes?.orderId;
        if (failedOrderId) {
          await OrderService.updatePaymentStatus(
            failedOrderId,
            'FAILED',
            payload.payment.order_id,
            payload.payment.id
          );

          // Cancel order if payment failed
          await OrderService.cancelOrder(failedOrderId);
        }
        break;

      case 'refund.created':
        // Update order with refund information
        const refundOrderId = payload.refund.notes?.orderId;
        if (refundOrderId) {
          await OrderService.updateOrderStatus(
            refundOrderId,
            'REFUNDED',
            'Refund initiated: ' + payload.refund.id
          );
        }
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Webhook processed',
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process webhook',
      },
      { status: 500 }
    );
  }
}