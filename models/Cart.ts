import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  productVariantId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  priceSnapshot?: Record<string, unknown>;
  giftWrapping?: boolean;
  giftMessage?: string;
}

export interface ICart extends Document {
  userId?: string;
  sessionId?: string;
  items: ICartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  couponCode?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    priceSnapshot: Schema.Types.Mixed,
    giftWrapping: Boolean,
    giftMessage: String,
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: String,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    items: [cartItemSchema],
    subtotal: {
      type: Number,
      default: 0,
    },
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
    total: {
      type: Number,
      default: 0,
    },
    couponCode: String,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  { timestamps: true }
);

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Cart =
  mongoose.models.Cart || mongoose.model<ICart>('Cart', cartSchema);