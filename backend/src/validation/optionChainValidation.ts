import { z } from 'zod';

export const strikeDataSchema = z.object({
  strikePrice: z.number().positive('Strike price must be positive'),
  ceOI: z.number().min(0, 'CE OI cannot be negative'),
  peOI: z.number().min(0, 'PE OI cannot be negative'),
  cePreviousOI: z.number().min(0).optional(),
  pePreviousOI: z.number().min(0).optional(),
  ceSecurityId: z.number().optional(),
  peSecurityId: z.number().optional(),
  ceLTP: z.number().min(0).optional(),
  peLTP: z.number().min(0).optional(),
  ceVolume: z.number().min(0).optional(),
  peVolume: z.number().min(0).optional(),
});

export const normalizedOptionChainSchema = z.object({
  index: z.enum(['NIFTY', 'BANK NIFTY', 'SENSEX'], {
    message: 'Index must be NIFTY, BANK NIFTY, or SENSEX'
  }),
  timestamp: z.string().datetime({ message: 'Invalid ISO timestamp string' }),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateStr must be in YYYY-MM-DD format'),
  timeStr: z.string().min(1, 'timeStr is required'),
  expiry: z.string().min(1, 'expiry is required'),
  underlyingValue: z.number().min(0).optional(),
  totalCallOI: z.number().min(0, 'Total Call OI cannot be negative'),
  totalPutOI: z.number().min(0, 'Total Put OI cannot be negative'),
  strikes: z.array(strikeDataSchema).min(1, 'Strikes array must contain at least one strike price record')
});

export const validateNormalizedOptionChain = (data: unknown) => {
  return normalizedOptionChainSchema.parse(data);
};

export const safeValidateNormalizedOptionChain = (data: unknown) => {
  return normalizedOptionChainSchema.safeParse(data);
};
