import mongoose, { Schema, Document } from 'mongoose';
import { SubscriptionStatus, AccessType } from '../types/auth';

export interface ISubscriptionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  plan: string;
  price: number;
  currency: string;
  status: SubscriptionStatus;
  type: AccessType;
  startDate?: Date;
  expiryDate?: Date;
  grantedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscriptionDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  plan: {
    type: String,
    default: 'monthly_499',
    required: true
  },
  price: {
    type: Number,
    default: 499,
    required: true
  },
  currency: {
    type: String,
    default: 'INR',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'inactive'],
    default: 'inactive',
    required: true
  },
  type: {
    type: String,
    enum: ['paid', 'admin_free'],
    default: 'paid',
    required: true
  },
  startDate: {
    type: Date
  },
  expiryDate: {
    type: Date,
    index: true
  },
  grantedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

SubscriptionSchema.index({ userId: 1, status: 1 });

export const Subscription = mongoose.model<ISubscriptionDocument>('Subscription', SubscriptionSchema);
