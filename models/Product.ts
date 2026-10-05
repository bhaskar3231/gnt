import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  type: 'GIFT' | 'TREAT' | 'CHILDREN' | 'GENERAL';
  brand?: string;
  categoryIds: mongoose.Types.ObjectId[];
  collectionIds: mongoose.Types.ObjectId[];
  tags: string[];
  images: {
    url: string;
    alt?: string;
    sortOrder?: number;
  }[];
  thumbnail?: string;
  variantIds: mongoose.Types.ObjectId[];
  attributes?: {
    // Treat-specific
    ingredients?: string[];
    allergens?: string[];
    netWeight?: string;
    shelfLife?: string;
    storageInstructions?: string;
    dietaryAttributes?: string[];
    nutritionalInformation?: Record<string, unknown>;
    batchInformation?: string;
    manufacturingDate?: Date;
    bestBeforeDate?: Date;
    // Children-specific
    ageRange?: string;
    skills?: string[];
    material?: string;
    difficulty?: string;
    screenFree?: boolean;
    ecoFriendly?: boolean;
    indoorOutdoor?: string;
    educationalCategory?: string;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  featured: boolean;
  bestSeller: boolean;
  newArrival: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
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
    shortDescription: String,
    description: String,
    type: {
      type: String,
      enum: ['GIFT', 'TREAT', 'CHILDREN', 'GENERAL'],
      default: 'GENERAL',
    },
    brand: String,
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
    tags: [String],
    images: [
      {
        url: String,
        alt: String,
        sortOrder: Number,
      },
    ],
    thumbnail: String,
    variantIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ProductVariant',
      },
    ],
    attributes: Schema.Types.Mixed,
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'INACTIVE'],
      default: 'DRAFT',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    bestSeller: {
      type: Boolean,
      default: false,
    },
    newArrival: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

productSchema.index({ slug: 1 });
productSchema.index({ status: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ bestSeller: 1 });
productSchema.index({ newArrival: 1 });
productSchema.index({ categoryIds: 1 });

export const Product =
  mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);