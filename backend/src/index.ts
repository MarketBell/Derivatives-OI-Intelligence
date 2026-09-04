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

// Middleware
app.use(cors());
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

// Centralized Error Handling Middleware
app.use(errorHandler);

import { collectorService } from './services/collectorService';

// Start Server & Connect MongoDB if not in test environment
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    await connectDatabase();
    app.listen(PORT, () => {
      Logger.info('Server', `${upstoxConfig.platformName} Server running on port ${PORT}`);
      Logger.info('Server', `Upstox Configured: ${isUpstoxConfigured() ? 'YES' : 'NO'}`);
      Logger.info('Server', `MongoDB Connected: ${isDatabaseConnected() ? 'YES' : 'NO'}`);

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
