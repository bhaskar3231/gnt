import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  productVariantId: mongoose.Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
      unique: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
    },
    availableQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    trackInventory: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

inventorySchema.index({ productVariantId: 1 });

export const Inventory =
  mongoose.models.Inventory ||
  mongoose.model<IInventory>('Inventory', inventorySchema);