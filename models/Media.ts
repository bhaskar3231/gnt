import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
  fileName: string;
  path: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  altText?: string;
  uploadedBy: mongoose.Types.ObjectId;
  folder: string;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    fileName: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    width: Number,
    height: Number,
    altText: String,
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    folder: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ folder: 1 });

export const Media =
  mongoose.models.Media || mongoose.model<IMedia>('Media', mediaSchema);