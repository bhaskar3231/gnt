import mongoose, { Schema, Document } from 'mongoose';

export type AuditAction =
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'ORDER_STATUS_CHANGED'
  | 'COUPON_CREATED'
  | 'COUPON_UPDATED'
  | 'HOMEPAGE_UPDATED'
  | 'ROLE_CHANGED'
  | 'ADMIN_LOGIN'
  | 'OTHER';

export interface IAuditLog extends Document {
  actor: mongoose.Types.ObjectId;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'PRODUCT_CREATED',
        'PRODUCT_UPDATED',
        'PRODUCT_DELETED',
        'ORDER_STATUS_CHANGED',
        'COUPON_CREATED',
        'COUPON_UPDATED',
        'HOMEPAGE_UPDATED',
        'ROLE_CHANGED',
        'ADMIN_LOGIN',
        'OTHER',
      ],
      required: true,
    },
    entity: {
      type: String,
      required: true,
    },
    entityId: String,
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    changes: String,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

export const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>('AuditLog', auditLogSchema);