import mongoose, { Schema, Document } from 'mongoose';

export interface IHeroSlide extends Document {
  desktopImage?: string;
  tabletImage?: string;
  mobileImage?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  primaryCTA?: string;
  secondaryCTA?: string;
  primaryLink?: string;
  secondaryLink?: string;
  alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
  overlay?: number;
  sortOrder: number;
  isActive: boolean;
  startAt?: Date;
  endAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const heroSlideSchema = new Schema<IHeroSlide>(
  {
    desktopImage: String,
    tabletImage: String,
    mobileImage: String,
    title: String,
    subtitle: String,
    description: String,
    primaryCTA: String,
    secondaryCTA: String,
    primaryLink: String,
    secondaryLink: String,
    alignment: {
      type: String,
      enum: ['LEFT', 'CENTER', 'RIGHT'],
      default: 'CENTER',
    },
    overlay: Number,
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

heroSlideSchema.index({ sortOrder: 1, isActive: 1 });

export const HeroSlide =
  mongoose.models.HeroSlide ||
  mongoose.model<IHeroSlide>('HeroSlide', heroSlideSchema);