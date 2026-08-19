import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import optionChainRoutes from './routes/optionChainRoutes';
import { errorHandler } from './utils/errorHandler';
import { dhanConfig } from './config/dhanConfig';

dotenv.config();

const app = express();
const PORT = dhanConfig.port;

// Middleware
app.use(express.json());

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok'
  });
});

// API Routes
app.use('/api/option-chain', optionChainRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[OI Intelligence Server] Listening on port ${PORT}`);
  });
}

export default app;
