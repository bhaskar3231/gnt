import mongoose, { Schema, Document } from 'mongoose';

export interface ICorporateEnquiry extends Document {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  quantity: number;
  budget?: number;
  deliveryLocation: string;
  requiredDate: Date;
  customization: string;
  message?: string;
  status:
    | 'NEW'
    | 'CONTACTED'
    | 'QUOTE_SENT'
    | 'NEGOTIATING'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'LOST';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const corporateEnquirySchema = new Schema<ICorporateEnquiry>(
  {
    companyName: {
      type: String,
      required: true,
    },
    contactName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    budget: Number,
    deliveryLocation: {
      type: String,
      required: true,
    },
    requiredDate: {
      type: Date,
      required: true,
    },
    customization: {
      type: String,
      required: true,
    },
    message: String,
    status: {
      type: String,
      enum: [
        'NEW',
        'CONTACTED',
        'QUOTE_SENT',
        'NEGOTIATING',
        'CONFIRMED',
        'COMPLETED',
        'LOST',
      ],
      default: 'NEW',
      index: true,
    },
    adminNotes: String,
  },
  { timestamps: true }
);

export const CorporateEnquiry =
  mongoose.models.CorporateEnquiry ||
  mongoose.model<ICorporateEnquiry>(
    'CorporateEnquiry',
    corporateEnquirySchema
  );