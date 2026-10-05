import mongoose, { Schema, Document } from 'mongoose';

export interface IHomepageSection extends Document {
  type:
    | 'HERO'
    | 'CATEGORY_GRID'
    | 'PRODUCT_GRID'
    | 'PRODUCT_CAROUSEL'
    | 'COLLECTION_BANNER'
    | 'OFFER_BANNER'
    | 'PROMO_STRIP'
    | 'IMAGE_TEXT'
    | 'TESTIMONIALS'
    | 'TRUST_FEATURES'
    | 'VIDEO'
    | 'FAQ'
    | 'CORPORATE_CTA'
    | 'NEWSLETTER';
  title?: string;
  subtitle?: string;
  configuration: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
  startAt?: Date;
  endAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const homepageSectionSchema = new Schema<IHomepageSection>(
  {
    type: {
      type: String,
      enum: [
        'HERO',
        'CATEGORY_GRID',
        'PRODUCT_GRID',
        'PRODUCT_CAROUSEL',
        'COLLECTION_BANNER',
        'OFFER_BANNER',
        'PROMO_STRIP',
        'IMAGE_TEXT',
        'TESTIMONIALS',
        'TRUST_FEATURES',
        'VIDEO',
        'FAQ',
        'CORPORATE_CTA',
        'NEWSLETTER',
      ],
      required: true,
    },
    title: String,
    subtitle: String,
    configuration: {
      type: Schema.Types.Mixed,
      required: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startAt: Date,
    endAt: Date,
  },
  { timestamps: true }
);

homepageSectionSchema.index({ sortOrder: 1, isActive: 1 });
homepageSectionSchema.index({ startAt: 1, endAt: 1 });

export const HomepageSection =
  mongoose.models.HomepageSection ||
  mongoose.model<IHomepageSection>(
    'HomepageSection',
    homepageSectionSchema
  );