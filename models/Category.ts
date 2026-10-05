import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: mongoose.Types.ObjectId;
  type: 'GIFT' | 'TREAT' | 'CHILDREN' | 'GENERAL';
  sortOrder: number;
  isActive: boolean;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },
    description: String,
    image: String,
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    type: {
      type: String,
      enum: ['GIFT', 'TREAT', 'CHILDREN', 'GENERAL'],
      default: 'GENERAL',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  { timestamps: true }
);

categorySchema.index({ parentId: 1 });

export const Category =
  mongoose.models.Category ||
  mongoose.model<ICategory>('Category', categorySchema);