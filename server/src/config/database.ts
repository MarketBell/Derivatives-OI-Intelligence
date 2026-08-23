import mongoose from 'mongoose';
import { dhanConfig } from './dhanConfig';
import { Logger } from '../utils/logger';

let isConnected = false;

export const connectDatabase = async (): Promise<boolean> => {
  if (isConnected) {
    return true;
  }

  try {
    const conn = await mongoose.connect(dhanConfig.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = conn.connection.readyState === 1;
    Logger.info('Database', `Connected to MongoDB successfully at ${dhanConfig.mongoUri}`);
    return isConnected;
  } catch (error: any) {
    Logger.error('Database', `MongoDB connection failed: ${error.message}`);
    isConnected = false;
    return false;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    Logger.info('Database', 'Disconnected from MongoDB');
  }
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  Logger.warn('Database', 'MongoDB connection lost');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  Logger.info('Database', 'MongoDB connection re-established');
});
