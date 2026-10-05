/**
 * Order Service
 * Business logic for order operations
 */

import { Order, Inventory, Product, User, AuditLog } from '@/models';
import { generateOrderNumber } from '@/lib/utils/format';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/constants';
import { Types } from 'mongoose';

export interface CreateOrderInput {
  customerId: string;
  items: any[];
  shippingAddress: any;
  billingAddress?: any;
  subtotal: number;
  discount?: number;
  shipping?: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  couponCode?: string;
}

export class OrderService {
  /**
   * Create order
   */
  static async createOrder(input: CreateOrderInput) {
    const orderNumber = generateOrderNumber();

    const order = new Order({
      orderNumber,
      customerId: new Types.ObjectId(input.customerId),
      items: input.items,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress || input.shippingAddress,
      subtotal: input.subtotal,
      discount: input.discount || 0,
      shipping: input.shipping || 0,
      tax: input.tax || 0,
      total: input.total,
      couponCode: input.couponCode,
      payment: {
        method: input.paymentMethod,
        status: PAYMENT_STATUSES.PENDING,
      },
      status: ORDER_STATUSES.PENDING_PAYMENT,
    });

    return await order.save();
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId: string) {
    return await Order.findById(orderId).populate(
      'customerId items.productVariantId'
    );
  }

  /**
   * Get orders by customer ID
   */
  static async getOrdersByCustomerId(customerId: string) {
    return await Order.find({ customerId })
      .populate('items.productVariantId')
      .sort({ createdAt: -1 });
  }

  /**
   * Get order by order number
   */
  static async getOrderByOrderNumber(orderNumber: string) {
    return await Order.findOne({ orderNumber }).populate(
      'customerId items.productVariantId'
    );
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: string,
    adminId?: string
  ) {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: newStatus },
      { new: true }
    );

    // Log audit trail
    if (adminId && order) {
      await AuditLog.create({
        actor: new Types.ObjectId(adminId),
        action: 'ORDER_STATUS_CHANGED',
        entity: 'Order',
        entityId: orderId,
        oldValue: { status: order.status },
        newValue: { status: newStatus },
      });
    }

    return order;
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(
    orderId: string,
    status: string,
    razorpayOrderId?: string,
    razorpayPaymentId?: string
  ) {
    const updateData: any = {
      'payment.status': status,
    };

    if (status === PAYMENT_STATUSES.COMPLETED) {
      updateData['payment.paidAt'] = new Date();
      updateData.status = ORDER_STATUSES.CONFIRMED;
    }

    if (razorpayOrderId) {
      updateData['payment.razorpayOrderId'] = razorpayOrderId;
    }

    if (razorpayPaymentId) {
      updateData['payment.razorpayPaymentId'] = razorpayPaymentId;
    }

    return await Order.findByIdAndUpdate(orderId, updateData, { new: true });
  }

  /**
   * Reserve inventory for order
   */
  static async reserveInventory(orderId: string) {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    for (const item of order.items) {
      const inventory = await Inventory.findOne({
        productVariantId: item.productVariantId,
      });

      if (!inventory) {
        throw new Error(
          `Inventory not found for variant ${item.productVariantId}`
        );
      }

      if (inventory.availableQuantity < item.quantity) {
        throw new Error(`Insufficient inventory for variant ${item.productVariantId}`);
      }

      inventory.reservedQuantity += item.quantity;
      inventory.availableQuantity -= item.quantity;
      await inventory.save();
    }
  }

  /**
   * Confirm order and finalize inventory
   */
  static async confirmOrder(orderId: string) {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // Reduce actual inventory
    for (const item of order.items) {
      const inventory = await Inventory.findOne({
        productVariantId: item.productVariantId,
      });

      if (inventory) {
        inventory.quantity -= item.quantity;
        inventory.reservedQuantity = Math.max(0, inventory.reservedQuantity - item.quantity);
        await inventory.save();
      }
    }

    return await this.updateOrderStatus(orderId, ORDER_STATUSES.CONFIRMED);
  }

  /**
   * Cancel order and release inventory
   */
  static async cancelOrder(orderId: string) {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // Release reserved inventory
    for (const item of order.items) {
      const inventory = await Inventory.findOne({
        productVariantId: item.productVariantId,
      });

      if (inventory) {
        inventory.availableQuantity += item.quantity;
        inventory.reservedQuantity = Math.max(0, inventory.reservedQuantity - item.quantity);
        await inventory.save();
      }
    }

    return await this.updateOrderStatus(orderId, ORDER_STATUSES.CANCELLED);
  }
}