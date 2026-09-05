import dotenv from 'dotenv';
import { SupportedIndex } from '../types/optionChain';

dotenv.config();

export interface UpstoxConfig {
  accessToken: string;
  clientId: string;
  baseUrl: string;
  mongoUri: string;
  port: number;
  instrumentKeys: Record<SupportedIndex, string>;
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

const resolveJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultDevSecret = 'biw_oi_mantra_default_secret_key_change_in_prod';

  if (isProduction && (!secret || secret.trim() === '' || secret === defaultDevSecret)) {
    throw new Error('FATAL SECURITY CONFIGURATION: In production mode, JWT_SECRET environment variable must be explicitly set to a strong secret key.');
  }

  return secret && secret.trim() !== '' ? secret : defaultDevSecret;
};

export const upstoxConfig: UpstoxConfig = {
  accessToken: process.env.UPSTOX_ACCESS_TOKEN || process.env.DHAN_ACCESS_TOKEN || '',
  clientId: process.env.UPSTOX_CLIENT_ID || process.env.DHAN_CLIENT_ID || '',
  baseUrl: process.env.UPSTOX_BASE_URL || 'https://api.upstox.com',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/oi_intelligence',
  port: parseInt(process.env.PORT || '5000', 10),
  instrumentKeys: {
    'NIFTY': 'NSE_INDEX|Nifty 50',
    'BANK NIFTY': 'NSE_INDEX|Nifty Bank',
    'SENSEX': 'BSE_INDEX|SENSEX'
  },
  platformName: 'BIW OI Mantra',
  jwtSecret: resolveJwtSecret(),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  razorpayStaticPaymentLink: process.env.RAZORPAY_STATIC_PAYMENT_LINK || 'https://rzp.io/l/biw-oi-mantra-499',
  enforceSubscription: process.env.ENFORCE_SUBSCRIPTION === 'true',
  supportEmail: 'billionitwealth@gmail.com',
  supportPhone: '8527675667'
};

export const isUpstoxConfigured = (): boolean => {
  return (
    Boolean(upstoxConfig.accessToken && upstoxConfig.accessToken.trim() !== '') &&
    Boolean(upstoxConfig.clientId && upstoxConfig.clientId.trim() !== '')
  );
};
