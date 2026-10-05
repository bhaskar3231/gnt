import mongoose, { Schema, Document } from 'mongoose';

export interface IOffer extends Document {
  name: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING' | 'BUNDLE';
  value: number;
  minimumCartValue?: number;
  maximumDiscount?: number;
  productIds?: mongoose.Types.ObjectId[];
  categoryIds?: mongoose.Types.ObjectId[];
  collectionIds?: mongoose.Types.ObjectId[];
  startAt: Date;
  endAt: Date;
  usageLimit?: number;
  perCustomerLimit?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING', 'BUNDLE'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    minimumCartValue: Number,
    maximumDiscount: Number,
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
    collectionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Collection',
      },
    ],
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    usageLimit: Number,
    perCustomerLimit: Number,
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

offerSchema.index({ startAt: 1, endAt: 1 });
offerSchema.index({ active: 1 });

export const Offer =
  mongoose.models.Offer || mongoose.model<IOffer>('Offer', offerSchema);