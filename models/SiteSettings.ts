import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettings extends Document {
  brandName: string;
  logo?: string;
  favicon?: string;
  contactEmail: string;
  phone: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  currency: string;
  announcementBar?: {
    text: string;
    isActive: boolean;
  };
  footer?: {
    aboutText?: string;
    links?: Array<{ label: string; url: string }>;
  };
  shippingSettings?: {
    freeShippingThreshold?: number;
    flatRate?: number;
    defaultShippingClass?: string;
  };
  taxSettings?: {
    taxPercentage?: number;
    enabled?: boolean;
  };
  updatedAt: Date;
}

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    brandName: {
      type: String,
      required: true,
      default: 'Gift & Treat',
    },
    logo: String,
    favicon: String,
    contactEmail: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    socialLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    announcementBar: {
      text: String,
      isActive: Boolean,
    },
    footer: {
      aboutText: String,
      links: [
        {
          label: String,
          url: String,
        },
      ],
    },
    shippingSettings: {
      freeShippingThreshold: Number,
      flatRate: Number,
      defaultShippingClass: String,
    },
    taxSettings: {
      taxPercentage: Number,
      enabled: Boolean,
    },
  },
  { timestamps: true }
);

export const SiteSettings =
  mongoose.models.SiteSettings ||
  mongoose.model<ISiteSettings>('SiteSettings', siteSettingsSchema);