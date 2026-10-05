import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productVariantId: mongoose.Types.ObjectId;
  productName: string;
  price: number;
  quantity: number;
  priceSnapshot: Record<string, unknown>;
  giftWrapping?: boolean;
  giftMessage?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  couponCode?: string;
  payment: {
    method: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    paidAt?: Date;
  };
  shipment?: {
    carrierName?: string;
    trackingNumber?: string;
    shippedAt?: Date;
  };
  status:
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'PROCESSING'
    | 'PACKED'
    | 'SHIPPED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'REFUND_PENDING'
    | 'REFUNDED'
    | 'RETURN_REQUESTED'
    | 'RETURNED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    priceSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    giftWrapping: Boolean,
    giftMessage: String,
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      name: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    billingAddress: {
      name: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    subtotal: Number,
    discount: {
      type: Number,
      default: 0,
    },
    shipping: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: Number,
    couponCode: String,
    payment: {
      method: String,
      status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
        default: 'PENDING',
      },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      paidAt: Date,
    },
    shipment: {
      carrierName: String,
      trackingNumber: String,
      shippedAt: Date,
    },
    status: {
      type: String,
      enum: [
        'PENDING_PAYMENT',
        'CONFIRMED',
        'PROCESSING',
        'PACKED',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'REFUND_PENDING',
        'REFUNDED',
        'RETURN_REQUESTED',
        'RETURNED',
      ],
      default: 'PENDING_PAYMENT',
      index: true,
    },
    notes: String,
  },
  { timestamps: true }
);

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: 1 });

export const Order =
  mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);