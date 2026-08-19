import { Request, Response, NextFunction } from 'express';
import { dhanService } from '../services/dhanService';
import { OptionChainResponse } from '../types/optionChain';

/**
 * Controller to handle GET /api/option-chain requests.
 */
export const getOptionChain = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const underlyingIndex = (req.query.index as string) || 'NIFTY';
    const expiry = req.query.expiry as string | undefined;

    // Check if real Dhan API configuration is available
    if (!dhanService.isConfigured()) {
      const response: OptionChainResponse = {
        success: false,
        status: 'pending_configuration',
        message: 'Dhan API credentials (DHAN_ACCESS_TOKEN, DHAN_CLIENT_ID) are not configured in environment.',
        configured: false,
        data: null,
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
      return;
    }

    // Call Dhan Service when API integration is configured
    try {
      const data = await dhanService.fetchOptionChain(underlyingIndex, expiry);
      const response: OptionChainResponse = {
        success: true,
        status: 'ok',
        configured: true,
        data,
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);
    } catch (apiError: any) {
      const response: OptionChainResponse = {
        success: false,
        status: 'error',
        message: apiError.message || 'Error fetching option chain data from Dhan API.',
        configured: true,
        data: null,
        timestamp: new Date().toISOString()
      };
      res.status(502).json(response);
    }
  } catch (err) {
    next(err);
  }
};
