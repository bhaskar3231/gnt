import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumOrder?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  usedCount: number;
  startAt: Date;
  endAt: Date;
  productIds?: mongoose.Types.ObjectId[];
  categoryIds?: mongoose.Types.ObjectId[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    minimumOrder: Number,
    maximumDiscount: Number,
    usageLimit: Number,
    perCustomerLimit: Number,
    usedCount: {
      type: Number,
      default: 0,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    productIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    categoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });
couponSchema.index({ startAt: 1, endAt: 1 });

export const Coupon =
  mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', couponSchema);