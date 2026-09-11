import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, AccessType, AccountStatus, ThemePreference, RegistrationPaymentStatus, RegistrationPaymentMethod } from '../types/auth';

export interface IRegistrationPayment {
  status: RegistrationPaymentStatus;      // none | proof_submitted | verified
  method?: RegistrationPaymentMethod;     // proof_upload | webhook
  amount?: number;                        // INR
  proofUploadedAt?: Date;
  verifiedAt?: Date;
}

export interface IUserDocument extends Document {
  email: string;
  name: string;
  passwordHash?: string;
  salt?: string;
  googleId?: string;
  picture?: string;
  phone?: string;
  role: UserRole;
  accessType: AccessType;
  status: AccountStatus;
  registrationPayment?: IRegistrationPayment;
  preferences: {
    theme: ThemePreference;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  passwordHash: {
    type: String
  },
  salt: {
    type: String
  },
  googleId: {
    type: String,
    sparse: true,
    index: true
  },
  picture: {
    type: String
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true
  },
  accessType: {
    type: String,
    enum: ['none', 'paid', 'admin_free'],
    default: 'none',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'revoked'],
    default: 'pending',
    required: true
  },
  registrationPayment: {
    status: {
      type: String,
      enum: ['none', 'proof_submitted', 'verified'],
      default: 'none'
    },
    method: {
      type: String,
      enum: ['proof_upload', 'webhook']
    },
    amount: { type: Number },
    proofUploadedAt: { type: Date },
    verifiedAt: { type: Date }
  },
  preferences: {
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark'
    }
  }
}, {
  timestamps: true
});

export const User = mongoose.model<IUserDocument>('User', UserSchema);
