import mongoose, { Schema, Document } from 'mongoose';

/**
 * Stores the registration-fee payment proof (screenshot or PDF receipt) that a
 * user uploads during sign-up. Kept in its own collection so the User documents
 * and the admin user list stay lean. Access is admin-only (served via an
 * authenticated, admin-guarded endpoint).
 */
export interface IPaymentProofDocument extends Document {
  userId?: mongoose.Types.ObjectId;
  email: string;
  dataUrl: string;        // full data: URL, e.g. "data:image/png;base64,...."
  contentType: string;    // image/png | image/jpeg | image/webp | application/pdf
  filename: string;
  size: number;           // decoded bytes
  amount: number;         // registration fee paid, in INR
  createdAt: Date;
  updatedAt: Date;
}

const PaymentProofSchema = new Schema<IPaymentProofDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  dataUrl: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    default: 499
  }
}, {
  timestamps: true
});

export const PaymentProof = mongoose.model<IPaymentProofDocument>('PaymentProof', PaymentProofSchema);
