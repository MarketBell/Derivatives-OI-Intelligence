import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import optionChainRoutes from './routes/optionChainRoutes';
import authRoutes from './routes/authRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import { errorHandler } from './utils/errorHandler';
import { upstoxConfig, isUpstoxConfigured } from './config/upstoxConfig';
import { connectDatabase, isDatabaseConnected } from './config/database';
import { Logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = upstoxConfig.port;

// CORS Configuration with environment override & development fallback
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins) {
        if (
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes('*') ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
      }
      // Development fallback: allow all local origins
      if (process.env.NODE_ENV !== 'production' || !allowedOrigins) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin rejected in production'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '5mb' }));

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    platform: upstoxConfig.platformName,
    dbConnected: isDatabaseConnected(),
    upstoxConfigured: isUpstoxConfigured(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/option-chain', optionChainRoutes);
app.use('/api/option-contract', optionChainRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

import { collectorService } from './services/collectorService';
import { disconnectDatabase } from './config/database';

let server: any = null;
let isShuttingDown = false;

// Graceful Shutdown Handler
export const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  Logger.info('Server', `Received ${signal}. Starting graceful shutdown...`);

  try {
    // 1. Stop collector intervals/timers
    collectorService.stopCollector();
    Logger.info('Server', 'Stopped option chain collector timers.');

    // 2. Disconnect MongoDB cleanly
    await disconnectDatabase();
    Logger.info('Server', 'Closed MongoDB connection.');

    // 3. Close HTTP server
    if (server) {
      server.close(() => {
        Logger.info('Server', 'HTTP server closed. Exiting process.');
        if (process.env.NODE_ENV !== 'test') {
          process.exit(0);
        }
      });
      // Safety timeout in case connections linger
      setTimeout(() => {
        Logger.warn('Server', 'Forced shutdown after timeout.');
        if (process.env.NODE_ENV !== 'test') {
          process.exit(0);
        }
      }, 5000).unref();
    } else if (process.env.NODE_ENV !== 'test') {
      process.exit(0);
    }
  } catch (err: any) {
    Logger.error('Server', `Error during graceful shutdown: ${err.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start Server & Connect MongoDB if not in test environment
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    await connectDatabase();
    server = app.listen(PORT, () => {
      Logger.info('Server', `${upstoxConfig.platformName} Server running on port ${PORT}`);
      Logger.info('Server', `Upstox Configured: ${isUpstoxConfigured() ? 'YES' : 'NO'}`);
      Logger.info('Server', `MongoDB Connected: ${isDatabaseConnected() ? 'YES' : 'NO'}`);

      // Initialize Admin password if ADMIN_INITIAL_PASSWORD is provided in environment
      if (process.env.ADMIN_INITIAL_PASSWORD && process.env.ADMIN_INITIAL_PASSWORD.trim().length >= 6) {
        import('./utils/seedAdminPassword').then(({ seedAdminPassword }) => {
          seedAdminPassword().catch((err) => {
            Logger.warn('Server', `Failed to initialize admin credentials from environment: ${err.message}`);
          });
        });
      }

      // Auto-start continuous collector at startup (default 3-minute interval)
      if (isUpstoxConfigured()) {
        collectorService.startCollector(3).catch((err) => {
          Logger.error('Server', `Failed to auto-start collector: ${err.message}`);
        });
      }
    });
  })();
}

export default app;
