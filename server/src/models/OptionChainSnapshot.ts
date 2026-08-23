import mongoose, { Schema, Document } from 'mongoose';
import { SupportedIndex, StrikeData } from '../types/optionChain';

export interface IOptionChainSnapshot extends Document {
  index: SupportedIndex;
  timestamp: Date;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // e.g. "09:15 AM"
  expiry: string;
  underlyingValue?: number;
  totalCallOI: number;
  totalPutOI: number;
  strikes: StrikeData[];
  createdAt: Date;
  updatedAt: Date;
}

const StrikeDataSchema = new Schema<StrikeData>({
  strikePrice: { type: Number, required: true },
  ceOI: { type: Number, required: true, min: 0 },
  peOI: { type: Number, required: true, min: 0 },
  cePreviousOI: { type: Number, default: 0 },
  pePreviousOI: { type: Number, default: 0 },
  ceSecurityId: { type: Number },
  peSecurityId: { type: Number },
  ceLTP: { type: Number, default: 0 },
  peLTP: { type: Number, default: 0 },
  ceVolume: { type: Number, default: 0 },
  peVolume: { type: Number, default: 0 }
}, { _id: false });

const OptionChainSnapshotSchema = new Schema<IOptionChainSnapshot>({
  index: {
    type: String,
    required: true,
    enum: ['NIFTY', 'BANK NIFTY', 'SENSEX'],
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  dateStr: {
    type: String,
    required: true,
    index: true
  },
  timeStr: {
    type: String,
    required: true
  },
  expiry: {
    type: String,
    required: true
  },
  underlyingValue: {
    type: Number
  },
  totalCallOI: {
    type: Number,
    required: true,
    min: 0
  },
  totalPutOI: {
    type: Number,
    required: true,
    min: 0
  },
  strikes: {
    type: [StrikeDataSchema],
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for fast time-series queries
OptionChainSnapshotSchema.index({ index: 1, timestamp: 1 }, { unique: true });
OptionChainSnapshotSchema.index({ index: 1, dateStr: 1, timestamp: 1 });

export const OptionChainSnapshot = mongoose.model<IOptionChainSnapshot>(
  'OptionChainSnapshot',
  OptionChainSnapshotSchema
);
