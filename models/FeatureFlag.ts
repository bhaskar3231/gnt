import mongoose, { Schema, Document } from 'mongoose';

export interface IFeatureFlag extends Document {
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const featureFlagSchema = new Schema<IFeatureFlag>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: String,
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const FeatureFlag =
  mongoose.models.FeatureFlag ||
  mongoose.model<IFeatureFlag>('FeatureFlag', featureFlagSchema);