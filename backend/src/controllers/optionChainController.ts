import { Request, Response, NextFunction } from 'express';
import { upstoxService } from '../services/upstoxService';
import { snapshotService } from '../services/snapshotService';
import { normalizationService } from '../services/normalizationService';
import { oiCalculationService } from '../services/oiCalculationService';
import { isDatabaseConnected } from '../config/database';
import { validateNormalizedOptionChain } from '../validation/optionChainValidation';
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
    const configured = upstoxService.isConfigured();

    const latestSnapshot = await snapshotService.getLatestSnapshot(index);

    const status = configured ? 'ok' : 'pending_configuration';
    const message = configured
      ? 'Upstox API configured and backend pipeline active.'
      : 'Upstox API credentials (UPSTOX_ACCESS_TOKEN, UPSTOX_CLIENT_ID) are not configured in environment.';

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
      configured: upstoxService.isConfigured(),
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
    const rawFreq = (req.query.frequency as string || '3m').toLowerCase();
    const frequency: '1m' | '3m' | '5m' = (rawFreq === '1m' || rawFreq === '1min') ? '1m' : (rawFreq === '5m' || rawFreq === '5min') ? '5m' : '3m';

    const availableDates = await snapshotService.getAvailableDates(index);
    const { collectorService } = await import('../services/collectorService');
    const collectorStatus = collectorService.getStatus();

    // If memory collector has recorded dates for this index, include them
    if (collectorStatus.latestDate && collectorStatus.index === index && !availableDates.includes(collectorStatus.latestDate)) {
      availableDates.unshift(collectorStatus.latestDate);
    }

    // Default to most recent date if available, else today
    if (!dateStr) {
      dateStr = availableDates.length > 0
        ? availableDates[0]
        : new Date().toISOString().split('T')[0];
    }

    // 1. Check snapshots from DB
    const snapshots = await snapshotService.getSnapshotsByDate(index, dateStr);

    let snapshotSummaryList: any[] = snapshots.map((s) => {
      const spot = s.underlyingValue || 0;
      let atm = 0;
      let pcr = 0;
      let strikeDetails: any[] = [];
      let callOI = s.totalCallOI;
      let putOI = s.totalPutOI;
      let prevCallOI = 0;
      let prevPutOI = 0;
      let callChangeVal = 0;
      let callChangePct = 0;
      let putChangeVal = 0;
      let putChangePct = 0;

      if (spot > 0 && s.strikes && s.strikes.length > 0) {
        const atmRes = oiCalculationService.extractATMPlus4OTM(s.strikes, spot, index);
        atm = atmRes.atmStrike;
        callOI = atmRes.totalCallOI;
        putOI = atmRes.totalPutOI;
        prevCallOI = atmRes.prevDayCloseCallOI;
        prevPutOI = atmRes.prevDayClosePutOI;
        callChangeVal = atmRes.callOIChangeVal;
        callChangePct = atmRes.callOIChangePct;
        putChangeVal = atmRes.putOIChangeVal;
        putChangePct = atmRes.putOIChangePct;
        pcr = atmRes.pcr;
        strikeDetails = atmRes.strikeDetails;
      }

      return {
        timeStr: s.timeStr,
        spotPrice: spot,
        atmStrike: atm,
        pcr,
        totalCallOI: callOI,
        totalPutOI: putOI,
        previousCallOI: prevCallOI,
        previousPutOI: prevPutOI,
        callOIChangeVal: callChangeVal,
        callOIChangePct: callChangePct,
        putOIChangeVal: putChangeVal,
        putOIChangePct: putChangePct,
        expiry: s.expiry,
        strikeDetails
      };
    });

    // 2. If DB has no snapshots for this date, check in-memory collector specifically for this index
    if (snapshotSummaryList.length === 0) {
      const memorySnapshots = collectorService.getSnapshots(index).filter(
        (s) => !dateStr || s.dateStr === dateStr
      );
      if (memorySnapshots.length > 0) {
        snapshotSummaryList = memorySnapshots.map((s) => ({
          timeStr: s.timeStr,
          spotPrice: s.spotPrice || s.underlyingValue,
          atmStrike: s.atmStrike,
          pcr: s.pcr,
          totalCallOI: s.totalCallOI,
          totalPutOI: s.totalPutOI,
          previousCallOI: s.previousCallOI,
          previousPutOI: s.previousPutOI,
          callOIChangeVal: s.callOIChangeVal,
          callOIChangePct: s.callOIChangePct,
          putOIChangeVal: s.putOIChangeVal,
          putOIChangePct: s.putOIChangePct,
          expiry: s.expiry,
          strikeDetails: s.strikeDetails
        }));
      }
    }

    // 3. If still no snapshots & Upstox is configured, trigger live Upstox fetch with bypassMarketHours
    let latestLiveExpiry = (collectorStatus.index === index ? collectorStatus.latestExpiry : null) || undefined;
    let latestLiveStrikeDetails = (collectorStatus.index === index ? collectorStatus.strikeDetails : null) || undefined;

    if (snapshotSummaryList.length === 0 && upstoxService.isConfigured()) {
      try {
        let liveSnapshot = await collectorService.executeCollectionCycle(index, true);
        if (!liveSnapshot) {
          // Direct fetch fallback if collector is busy
          const { normalized } = await upstoxService.fetchOptionChain(index);
          const validated = validateNormalizedOptionChain(normalized);
          const spot = validated.underlyingValue || 0;
          const atmRes = oiCalculationService.extractATMPlus4OTM(validated.strikes, spot, index);
          liveSnapshot = {
            timestamp: validated.timestamp,
            dateStr: validated.dateStr,
            timeStr: validated.timeStr,
            index: validated.index,
            expiry: validated.expiry,
            underlyingValue: spot,
            spotPrice: spot,
            atmStrike: atmRes.atmStrike,
            strikeSpacing: atmRes.strikeSpacing,
            pcr: atmRes.pcr,
            totalCallOI: atmRes.totalCallOI,
            totalPutOI: atmRes.totalPutOI,
            previousCallOI: atmRes.prevDayCloseCallOI,
            previousPutOI: atmRes.prevDayClosePutOI,
            callOIChangeVal: atmRes.callOIChangeVal,
            callOIChangePct: atmRes.callOIChangePct,
            putOIChangeVal: atmRes.putOIChangeVal,
            putOIChangePct: atmRes.putOIChangePct,
            baselineCallOIChangeVal: atmRes.callOIChangeVal,
            baselineCallOIChangePct: atmRes.callOIChangePct,
            baselinePutOIChangeVal: atmRes.putOIChangeVal,
            baselinePutOIChangePct: atmRes.putOIChangePct,
            strikesCount: validated.strikes.length,
            strikeDetails: atmRes.strikeDetails,
            strikes: validated.strikes
          };
        }

        if (liveSnapshot) {
          if (!availableDates.includes(liveSnapshot.dateStr)) {
            availableDates.unshift(liveSnapshot.dateStr);
          }
          dateStr = liveSnapshot.dateStr;
          latestLiveExpiry = liveSnapshot.expiry;
          latestLiveStrikeDetails = liveSnapshot.strikeDetails;

          snapshotSummaryList = [
            {
              timeStr: liveSnapshot.timeStr,
              spotPrice: liveSnapshot.spotPrice || liveSnapshot.underlyingValue,
              atmStrike: liveSnapshot.atmStrike,
              pcr: liveSnapshot.pcr,
              totalCallOI: liveSnapshot.totalCallOI,
              totalPutOI: liveSnapshot.totalPutOI,
              previousCallOI: liveSnapshot.previousCallOI,
              previousPutOI: liveSnapshot.previousPutOI,
              callOIChangeVal: liveSnapshot.callOIChangeVal,
              callOIChangePct: liveSnapshot.callOIChangePct,
              putOIChangeVal: liveSnapshot.putOIChangeVal,
              putOIChangePct: liveSnapshot.putOIChangePct,
              expiry: liveSnapshot.expiry,
              strikeDetails: liveSnapshot.strikeDetails
            }
          ];
        }
      } catch (liveErr: any) {
        Logger.error('OptionChainController', `Live fetch on-demand failed for ${index}: ${liveErr.message}`);
      }
    }

    // Determine latest expiry and strikeDetails
    if (!latestLiveExpiry && snapshotSummaryList.length > 0) {
      latestLiveExpiry = snapshotSummaryList[snapshotSummaryList.length - 1].expiry;
    }
    if (!latestLiveStrikeDetails && snapshotSummaryList.length > 0) {
      latestLiveStrikeDetails = snapshotSummaryList[snapshotSummaryList.length - 1].strikeDetails;
    }

    const dataset = oiCalculationService.calculateTimeSeriesDataset(
      index,
      dateStr,
      availableDates,
      snapshotSummaryList,
      startTime,
      endTime,
      latestLiveExpiry,
      latestLiveStrikeDetails,
      frequency
    );

    const response: OptionChainApiResponse = {
      success: true,
      status: 'ok',
      configured: upstoxService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: dataset,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (err: any) {
    if (
      err.message === 'Start time cannot be later than end time' ||
      err.message === 'Invalid timestamp format'
    ) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: err.message === 'Start time cannot be later than end time'
          ? 'Start time cannot be later than end time.'
          : err.message,
        configured: upstoxService.isConfigured(),
        dbConnected: isDatabaseConnected(),
        data: null,
        timestamp: new Date().toISOString()
      });
      return;
    }
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
        configured: upstoxService.isConfigured(),
        dbConnected: isDatabaseConnected(),
        data: null,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const normalized = normalizationService.normalizeSnapshotInput(input);
    const saved = isDatabaseConnected()
      ? await snapshotService.saveSnapshot(normalized)
      : validateNormalizedOptionChain(normalized);

    const response: OptionChainApiResponse = {
      success: true,
      status: 'ok',
      message: 'Option chain snapshot normalized, validated, and saved successfully.',
      configured: upstoxService.isConfigured(),
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
      configured: upstoxService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: null,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * POST /api/option-chain/fetch
 * Trigger live Upstox API fetch, normalize, validate, and return processed data
 */
export const triggerLiveFetch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const index = parseIndexParam(req.query.index as string || req.body?.index);
    const expiry = (req.query.expiry as string || req.body?.expiry || undefined);

    if (!upstoxService.isConfigured()) {
      res.status(200).json({
        success: false,
        status: 'pending_configuration',
        message: 'Upstox API credentials (UPSTOX_ACCESS_TOKEN, UPSTOX_CLIENT_ID) are missing or incomplete in environment.',
        configured: false,
        dbConnected: isDatabaseConnected(),
        data: null,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { normalized } = await upstoxService.fetchOptionChain(index, expiry);
    
    // Validate normalized data
    const validated = validateNormalizedOptionChain(normalized);

    let saved: any = validated;
    if (isDatabaseConnected()) {
      saved = await snapshotService.saveSnapshot(validated);
    }

    res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Live Upstox option-chain data fetched, normalized, and validated.',
      configured: true,
      dbConnected: isDatabaseConnected(),
      data: saved,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    Logger.error('OptionChainController', `Error triggering live Upstox fetch: ${err.message}`);
    res.status(502).json({
      success: false,
      status: 'error',
      message: err.message || 'Live Upstox option-chain fetch failed.',
      configured: upstoxService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: null,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/option-chain/collection-status
 * Check status of 1m/3m/5m automated collection and view collected snapshots
 */
export const getCollectionStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { collectorService } = await import('../services/collectorService');
    const status = collectorService.getStatus();

    res.status(200).json({
      success: true,
      status: 'ok',
      configured: upstoxService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/option-chain/collector/start
 * Start or reconfigure the live data collector (interval: 1, 3, 5 minutes or custom seconds)
 */
export const startCollectorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { collectorService } = await import('../services/collectorService');

    const index = parseIndexParam(req.query.index as string || req.body?.index);
    const rawInterval = req.query.interval || req.body?.interval;
    const rawSeconds = req.query.intervalSeconds || req.body?.intervalSeconds;
    const bypassMarketHours = req.query.bypassMarketHours === 'true' || req.body?.bypassMarketHours === true;

    let intervalMinutes = 3; // Default 3 minutes
    if (rawInterval) {
      const parsed = parseInt(String(rawInterval), 10);
      if (!isNaN(parsed) && parsed > 0) {
        intervalMinutes = parsed;
      }
    }

    let intervalSeconds: number | undefined;
    if (rawSeconds) {
      const parsedSec = parseInt(String(rawSeconds), 10);
      if (!isNaN(parsedSec) && parsedSec > 0) {
        intervalSeconds = parsedSec;
      }
    }

    const status = await collectorService.startCollector(
      intervalMinutes,
      intervalSeconds,
      true,
      index,
      bypassMarketHours
    );

    res.status(200).json({
      success: true,
      status: 'ok',
      message: `Collector started for ${index} with ${intervalMinutes}m interval (${status.intervalSeconds}s).`,
      configured: upstoxService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/option-chain/collector/stop
 * Stop the live data collector
 */
export const stopCollectorHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { collectorService } = await import('../services/collectorService');
    const status = collectorService.stopCollector();

    res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Collector stopped.',
      configured: upstoxService.isConfigured(),
      dbConnected: isDatabaseConnected(),
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};


