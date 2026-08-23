import dotenv from 'dotenv';
import { SupportedIndex } from '../types/optionChain';

dotenv.config();

export interface DhanConfig {
  accessToken: string;
  clientId: string;
  baseUrl: string;
  mongoUri: string;
  port: number;
  securityIds: Record<SupportedIndex, number>;
  // Platform specific configuration
  platformName: string;
  jwtSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  razorpayStaticPaymentLink: string;
  enforceSubscription: boolean;
  supportEmail: string;
  supportPhone: string;
}

export const dhanConfig: DhanConfig = {
  accessToken: process.env.DHAN_ACCESS_TOKEN || '',
  clientId: process.env.DHAN_CLIENT_ID || '',
  baseUrl: process.env.DHAN_BASE_URL || 'https://api.dhan.co',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/oi_intelligence',
  port: parseInt(process.env.PORT || '5000', 10),
  securityIds: {
    'NIFTY': 13,
    'BANK NIFTY': 25,
    'SENSEX': 51
  },
  platformName: 'BIW OI Mantra',
  jwtSecret: process.env.JWT_SECRET || 'biw_oi_mantra_default_secret_key_change_in_prod',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  razorpayStaticPaymentLink: process.env.RAZORPAY_STATIC_PAYMENT_LINK || 'https://rzp.io/l/biw-oi-mantra-499',
  enforceSubscription: process.env.ENFORCE_SUBSCRIPTION === 'true',
  supportEmail: 'billionitwealth@gmail.com',
  supportPhone: '8527675667'
};

export const isDhanConfigured = (): boolean => {
  return (
    Boolean(dhanConfig.accessToken && dhanConfig.accessToken.trim() !== '') &&
    Boolean(dhanConfig.clientId && dhanConfig.clientId.trim() !== '')
  );
};
