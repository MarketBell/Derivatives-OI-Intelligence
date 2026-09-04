import { Request, Response, NextFunction } from 'express';
import { Logger } from './logger';
import { isDatabaseConnected } from '../config/database';
import { upstoxService } from '../services/upstoxService';

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Centralized Express Error Handler Middleware
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  Logger.error('ErrorHandler', `[${req.method} ${req.url}] HTTP ${statusCode} - ${message}`);

  res.status(statusCode).json({
    success: false,
    status: 'error',
    message,
    configured: upstoxService.isConfigured(),
    dbConnected: isDatabaseConnected(),
    data: null,
    timestamp: new Date().toISOString()
  });
};
