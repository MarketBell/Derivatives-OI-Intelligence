import dotenv from 'dotenv';

dotenv.config();

export interface DhanConfig {
  accessToken: string;
  clientId: string;
  baseUrl: string;
  port: number;
}

export const dhanConfig: DhanConfig = {
  accessToken: process.env.DHAN_ACCESS_TOKEN || '',
  clientId: process.env.DHAN_CLIENT_ID || '',
  baseUrl: process.env.DHAN_BASE_URL || 'https://api.dhan.co',
  port: parseInt(process.env.PORT || '5000', 10),
};

export const isDhanConfigured = (): boolean => {
  return (
    Boolean(dhanConfig.accessToken && dhanConfig.accessToken.trim() !== '') &&
    Boolean(dhanConfig.clientId && dhanConfig.clientId.trim() !== '')
  );
};
