import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant extends Document {
  productId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  inventory: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  attributes?: Record<string, unknown>;
  barcode?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productVariantSchema = new Schema<IProductVariant>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    compareAtPrice: Number,
    inventory: {
      type: Number,
      required: true,
      default: 0,
    },
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: String,
    },
    attributes: Schema.Types.Mixed,
    barcode: String,
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const ProductVariant =
  mongoose.models.ProductVariant ||
  mongoose.model<IProductVariant>('ProductVariant', productVariantSchema);