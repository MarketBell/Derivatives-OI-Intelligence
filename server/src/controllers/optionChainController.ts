import { Request, Response, NextFunction } from 'express';
import { dhanService } from '../services/dhanService';
import { snapshotService } from '../services/snapshotService';
import { normalizationService } from '../services/normalizationService';
import { oiCalculationService } from '../services/oiCalculationService';
import { isDatabaseConnected } from '../config/database';
import { SupportedIndex, OptionChainApiResponse } from '../types/optionChain';
import { Logger } from '../utils/logger';

const parseIndexParam = (rawIndex?: string): SupportedIndex => {
  if (!rawIndex) return 'NIFTY';
  const upper = rawIndex.toUpperCase();
  if (upper === 'BANKNIFTY' || upper === 'BANK NIFTY') return 'BANK NIFTY';
  if (upper === 'SENSEX') return 'SENSEX';
  return 'NIFTY';
};

/**
 * GET /api/option-chain
 * Returns system configuration status & latest stored snapshot
 */
export const getLatestOptionChain = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const index = parseIndexParam(req.query.index as string);
    const dbConnected = isDatabaseConnected();
    const configured = dhanService.isConfigured();

    const latestSnapshot = await snapshotService.getLatestSnapshot(index);

    const status = configured ? 'ok' : 'pending_configuration';
    const message = configured
      ? 'Dhan API configured and backend pipeline active.'
      : 'Dhan API credentials (DHAN_ACCESS_TOKEN, DHAN_CLIENT_ID) are not configured in environment.';

    const response: OptionChainApiResponse = {
      success: configured,
      status,
      message,
      configured,
      dbConnected,
      data: latestSnapshot,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/option-chain/dates
 * Returns recorded snapshot dates for an index
 */
export const getAvailableDates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const index = parseIndexParam(req.query.index as string);
    const dates = await snapshotService.getAvailableDates(index);

    const response: OptionChainApiResponse = {
      success: true,
      status: 'ok',
      configured: dhanService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: { index, availableDates: dates },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/option-chain/time-series
 * Returns calculated time-series dataset formatted for frontend dashboard consumption
 */
export const getTimeSeriesData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const index = parseIndexParam(req.query.index as string);
    let dateStr = req.query.date as string;
    const startTime = req.query.startTime as string | undefined;
    const endTime = req.query.endTime as string | undefined;

    const availableDates = await snapshotService.getAvailableDates(index);

    // Default to most recent date if available, else today
    if (!dateStr) {
      dateStr = availableDates.length > 0
        ? availableDates[0]
        : new Date().toISOString().split('T')[0];
    }

    const snapshots = await snapshotService.getSnapshotsByDate(index, dateStr);

    const snapshotSummaryList = snapshots.map((s) => ({
      timeStr: s.timeStr,
      totalCallOI: s.totalCallOI,
      totalPutOI: s.totalPutOI
    }));

    const dataset = oiCalculationService.calculateTimeSeriesDataset(
      index,
      dateStr,
      availableDates,
      snapshotSummaryList,
      startTime,
      endTime
    );

    const response: OptionChainApiResponse = {
      success: true,
      status: 'ok',
      configured: dhanService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: dataset,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/option-chain/snapshot
 * Manual ingest or seed snapshot into MongoDB
 */
export const postSnapshot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = req.body;
    if (!input || !input.index || !input.expiry) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Invalid payload: index and expiry are required fields.',
        configured: dhanService.isConfigured(),
        dbConnected: isDatabaseConnected(),
        data: null,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const normalized = normalizationService.normalizeSnapshotInput(input);
    const saved = await snapshotService.saveSnapshot(normalized);

    const response: OptionChainApiResponse = {
      success: true,
      status: 'ok',
      message: 'Option chain snapshot normalized, validated, and saved successfully.',
      configured: dhanService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: saved,
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (err: any) {
    Logger.error('OptionChainController', `Failed to post snapshot: ${err.message}`);
    res.status(400).json({
      success: false,
      status: 'error',
      message: err.message || 'Snapshot ingestion failed.',
      configured: dhanService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: null,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * POST /api/option-chain/fetch
 * Trigger live Dhan API fetch, normalize, validate, and store snapshot
 */
export const triggerLiveFetch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const index = parseIndexParam(req.query.index as string || req.body?.index);
    const expiry = (req.query.expiry as string || req.body?.expiry || '2026-08-28');

    if (!dhanService.isConfigured()) {
      res.status(200).json({
        success: false,
        status: 'pending_configuration',
        message: 'Dhan API credentials (DHAN_ACCESS_TOKEN, DHAN_CLIENT_ID) are missing or incomplete in environment.',
        configured: false,
        dbConnected: isDatabaseConnected(),
        data: null,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { normalized } = await dhanService.fetchOptionChain(index, expiry);
    const saved = await snapshotService.saveSnapshot(normalized);

    res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Live Dhan option-chain data fetched, normalized, validated, and saved to MongoDB.',
      configured: true,
      dbConnected: isDatabaseConnected(),
      data: saved,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    Logger.error('OptionChainController', `Error triggering live Dhan fetch: ${err.message}`);
    res.status(502).json({
      success: false,
      status: 'error',
      message: err.message || 'Live Dhan option-chain fetch failed.',
      configured: dhanService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: null,
      timestamp: new Date().toISOString()
    });
  }
};
