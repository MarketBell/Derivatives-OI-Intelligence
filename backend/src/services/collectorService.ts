import { upstoxService } from './upstoxService';
import { snapshotService } from './snapshotService';
import { oiCalculationService } from './oiCalculationService';
import { validateNormalizedOptionChain } from '../validation/optionChainValidation';
import { isDatabaseConnected } from '../config/database';
import { NormalizedOptionChain, SupportedIndex, StrikeDetail, StrikeData } from '../types/optionChain';
import { isMarketHours, getMarketHoursStatus, MarketHoursStatus } from '../utils/marketHours';
import { Logger } from '../utils/logger';

export interface CollectedSnapshotSummary {
  timestamp: string;
  dateStr: string;
  timeStr: string;
  index: SupportedIndex;
  expiry: string;
  underlyingValue?: number;
  spotPrice?: number;
  atmStrike?: number;
  strikeSpacing?: number;
  pcr?: number;
  // ATM + 4 OTM OI values
  totalCallOI: number;
  totalPutOI: number;
  // Previous trading day closing baseline values
  previousCallOI?: number;
  previousPutOI?: number;
  // Changes against previous trading day close baseline
  callOIChangeVal: number;
  callOIChangePct: number;
  putOIChangeVal: number;
  putOIChangePct: number;
  // Session baseline changes
  baselineCallOIChangeVal?: number;
  baselineCallOIChangePct?: number;
  baselinePutOIChangeVal?: number;
  baselinePutOIChangePct?: number;
  strikesCount: number;
  strikeDetails?: StrikeDetail[];
  strikes?: StrikeData[];
}

export interface CollectorStatusResponse {
  isRunning: boolean;
  index: SupportedIndex;
  supportedIndices: SupportedIndex[];
  intervalMinutes: number;
  intervalSeconds: number;
  marketHours: MarketHoursStatus;
  snapshotCount: number;
  latestTimestamp: string | null;
  latestDate: string | null;
  latestTime: string | null;
  latestExpiry: string | null;
  latestUnderlyingValue: number | null;
  spotPrice: number | null;
  atmStrike: number | null;
  pcr: number | null;
  latestTotalCallOI: number | null;
  latestTotalPutOI: number | null;
  previousTotalCallOI: number | null;
  previousTotalPutOI: number | null;
  latestCallOIChangeVal: number | null;
  latestCallOIChangePct: number | null;
  latestPutOIChangeVal: number | null;
  latestPutOIChangePct: number | null;
  strikeDetails?: StrikeDetail[];
  lastError: string | null;
  recentSnapshots: CollectedSnapshotSummary[];
}

export class CollectorService {
  private isRunning: boolean = false;
  // Primary default interval is 3 minutes (180 seconds)
  private intervalMinutes: number = 3;
  private intervalSeconds: number = 180;
  private timerId: NodeJS.Timeout | null = null;
  private isCollecting: boolean = false;
  private targetIndex: SupportedIndex = 'NIFTY';
  private bypassMarketHours: boolean = false;

  // In-memory safe ring buffer (last 200 snapshots)
  private inMemorySnapshots: CollectedSnapshotSummary[] = [];
  private latestNormalized: NormalizedOptionChain | null = null;
  private previousNormalized: NormalizedOptionChain | null = null;
  private lastError: string | null = null;

  /**
   * Start periodic collection of real Upstox option chain data.
   *
   * @param intervalMinutes Primary default 3 min; 1 min and 5 min supported (or custom)
   * @param intervalSeconds Optional explicit interval in seconds
   * @param autoFetchImmediate Trigger immediate first fetch cycle
   * @param index Target index ('NIFTY' | 'BANK NIFTY' | 'SENSEX')
   * @param bypassMarketHours Bypass market hours check (for tests/manual override)
   */
  public async startCollector(
    intervalMinutes: number = 3,
    intervalSeconds?: number,
    autoFetchImmediate: boolean = true,
    index: SupportedIndex = 'NIFTY',
    bypassMarketHours: boolean = false
  ): Promise<CollectorStatusResponse> {
    this.stopCollector();

    this.targetIndex = index;
    this.intervalMinutes = intervalMinutes;
    this.intervalSeconds = intervalSeconds !== undefined && intervalSeconds > 0
      ? intervalSeconds
      : intervalMinutes * 60;
    this.bypassMarketHours = bypassMarketHours;

    this.isRunning = true;
    Logger.info(
      'CollectorService',
      `Starting ${this.targetIndex} OI Collector with interval: ${this.intervalMinutes}m (${this.intervalSeconds}s)`
    );

    if (autoFetchImmediate) {
      await this.executeCollectionCycle(this.targetIndex, this.bypassMarketHours);
    }

    const intervalMs = this.intervalSeconds * 1000;
    this.timerId = setInterval(() => {
      this.executeCollectionCycle(this.targetIndex, this.bypassMarketHours).catch((err) => {
        Logger.error('CollectorService', `Uncaught cycle error: ${err.message}`);
      });
    }, intervalMs);

    return this.getStatus();
  }

  /**
   * Stop the running collector timer.
   */
  public stopCollector(): CollectorStatusResponse {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    Logger.info('CollectorService', 'OI Collector stopped.');
    return this.getStatus();
  }

  /**
   * Execute a single collection cycle:
   * 1. Check Indian Market Hours (09:15 AM to 03:40 PM IST, Mon-Fri)
   * 2. Fetch real option-chain from Upstox API
   * 3. Normalize & validate via Zod schema (enforcing ₹50/₹100 strike intervals)
   * 4. Dynamically determine ATM strike from live spot price
   * 5. Extract ATM + 4 OTM strikes (5 Call + 5 Put = 9 unique strikes)
   * 6. Calculate totalCallOI, totalPutOI, PCR, and baseline OI Changes against Previous Day Closing
   * 7. Persist to MongoDB (if connected) & update in-memory ring buffer
   */
  public async executeCollectionCycle(
    index: SupportedIndex = this.targetIndex,
    bypassMarketHoursCheck: boolean = this.bypassMarketHours
  ): Promise<CollectedSnapshotSummary | null> {
    if (this.isCollecting) {
      Logger.warn('CollectorService', 'Previous collection cycle is still running. Skipping iteration.');
      return null;
    }

    // 1. Market Hours Guard: 09:15 AM to 03:40 PM IST, Monday - Friday
    if (!bypassMarketHoursCheck && !isMarketHours()) {
      const status = getMarketHoursStatus();
      Logger.info('CollectorService', `Skipping collection cycle: ${status.reason}`);
      return null;
    }

    this.isCollecting = true;
    try {
      Logger.info('CollectorService', `Executing collection cycle for ${index}...`);

      // 2. Fetch real option chain data from Upstox
      const { normalized } = await upstoxService.fetchOptionChain(index);

      // 3. Runtime validation
      const validated = validateNormalizedOptionChain(normalized);

      // 4. Calculate dynamic ATM and ATM + 4 OTM strikes
      const spotPrice = validated.underlyingValue || 0;
      let totalCallOI = validated.totalCallOI;
      let totalPutOI = validated.totalPutOI;
      let previousCallOI = 0;
      let previousPutOI = 0;
      let callOIChangeVal = 0;
      let callOIChangePct = 0;
      let putOIChangeVal = 0;
      let putOIChangePct = 0;
      let pcr = 0;
      let atmStrike = 0;
      let strikeSpacing = oiCalculationService.getStrikeSpacing(index);
      let strikeDetails: StrikeDetail[] = [];

      if (spotPrice > 0 && validated.strikes.length > 0) {
        const atmRes = oiCalculationService.extractATMPlus4OTM(validated.strikes, spotPrice, index);
        totalCallOI = atmRes.totalCallOI;
        totalPutOI = atmRes.totalPutOI;
        previousCallOI = atmRes.prevDayCloseCallOI;
        previousPutOI = atmRes.prevDayClosePutOI;
        callOIChangeVal = atmRes.callOIChangeVal;
        callOIChangePct = atmRes.callOIChangePct;
        putOIChangeVal = atmRes.putOIChangeVal;
        putOIChangePct = atmRes.putOIChangePct;
        pcr = atmRes.pcr;
        atmStrike = atmRes.atmStrike;
        strikeSpacing = atmRes.strikeSpacing;
        strikeDetails = atmRes.strikeDetails;
      } else {
        totalCallOI = validated.totalCallOI;
        totalPutOI = validated.totalPutOI;
        pcr = totalCallOI > 0 ? Math.round((totalPutOI / totalCallOI) * 100) / 100 : 0;
      }

      // 5. Update validated object totals to match ATM + 4 OTM calculations
      validated.totalCallOI = totalCallOI;
      validated.totalPutOI = totalPutOI;

      // 6. Calculate baseline deltas (against session start)
      let baselineCallOIChangeVal = callOIChangeVal;
      let baselineCallOIChangePct = callOIChangePct;
      let baselinePutOIChangeVal = putOIChangeVal;
      let baselinePutOIChangePct = putOIChangePct;

      if (this.inMemorySnapshots.length > 0) {
        const sessionStart = this.inMemorySnapshots[0];
        baselineCallOIChangeVal = Math.round((totalCallOI - sessionStart.totalCallOI) * 100) / 100;
        baselineCallOIChangePct = oiCalculationService.calculatePercentage(
          baselineCallOIChangeVal,
          sessionStart.totalCallOI
        );
        baselinePutOIChangeVal = Math.round((totalPutOI - sessionStart.totalPutOI) * 100) / 100;
        baselinePutOIChangePct = oiCalculationService.calculatePercentage(
          baselinePutOIChangeVal,
          sessionStart.totalPutOI
        );
      }

      // 7. Persist to MongoDB if connected
      if (isDatabaseConnected()) {
        try {
          await snapshotService.saveSnapshot(validated);
        } catch (dbErr: any) {
          Logger.warn('CollectorService', `MongoDB persistence skipped/failed: ${dbErr.message}`);
        }
      }

      const summaryItem: CollectedSnapshotSummary = {
        timestamp: validated.timestamp,
        dateStr: validated.dateStr,
        timeStr: validated.timeStr,
        index: validated.index,
        expiry: validated.expiry,
        underlyingValue: spotPrice,
        spotPrice,
        atmStrike,
        strikeSpacing,
        pcr,
        totalCallOI,
        totalPutOI,
        previousCallOI,
        previousPutOI,
        callOIChangeVal,
        callOIChangePct,
        putOIChangeVal,
        putOIChangePct,
        baselineCallOIChangeVal,
        baselineCallOIChangePct,
        baselinePutOIChangeVal,
        baselinePutOIChangePct,
        strikesCount: validated.strikes.length,
        strikeDetails,
        strikes: validated.strikes
      };

      // 8. Update in-memory state
      this.previousNormalized = this.latestNormalized;
      this.latestNormalized = validated;
      this.inMemorySnapshots.push(summaryItem);
      if (this.inMemorySnapshots.length > 200) {
        this.inMemorySnapshots.shift();
      }

      this.lastError = null;

      Logger.info(
        'CollectorService',
        `Cycle completed for ${index} at ${validated.timeStr}. Spot: ${spotPrice}, ATM: ${atmStrike}, Call OI (ATM+4): ${totalCallOI} (Δ vs Prev Close: ${callOIChangeVal}), Put OI (ATM+4): ${totalPutOI} (Δ vs Prev Close: ${putOIChangeVal}), PCR: ${pcr}`
      );

      return summaryItem;
    } catch (err: any) {
      this.lastError = err.message || 'Collection cycle failed';
      Logger.error('CollectorService', `Collection cycle failed: ${this.lastError}`);
      return null;
    } finally {
      this.isCollecting = false;
    }
  }

  /**
   * Get current collector status and recent snapshot history.
   */
  public getStatus(): CollectorStatusResponse {
    const latestSummary = this.inMemorySnapshots.length > 0
      ? this.inMemorySnapshots[this.inMemorySnapshots.length - 1]
      : null;

    return {
      isRunning: this.isRunning,
      index: this.targetIndex,
      supportedIndices: ['NIFTY', 'BANK NIFTY', 'SENSEX'],
      intervalMinutes: this.intervalMinutes,
      intervalSeconds: this.intervalSeconds,
      marketHours: getMarketHoursStatus(),
      snapshotCount: this.inMemorySnapshots.length,
      latestTimestamp: latestSummary?.timestamp || this.latestNormalized?.timestamp || null,
      latestDate: latestSummary?.dateStr || this.latestNormalized?.dateStr || null,
      latestTime: latestSummary?.timeStr || this.latestNormalized?.timeStr || null,
      latestExpiry: latestSummary?.expiry || this.latestNormalized?.expiry || null,
      latestUnderlyingValue: latestSummary?.underlyingValue ?? this.latestNormalized?.underlyingValue ?? null,
      spotPrice: latestSummary?.spotPrice ?? this.latestNormalized?.underlyingValue ?? null,
      atmStrike: latestSummary?.atmStrike ?? null,
      pcr: latestSummary?.pcr ?? null,
      latestTotalCallOI: latestSummary?.totalCallOI ?? this.latestNormalized?.totalCallOI ?? null,
      latestTotalPutOI: latestSummary?.totalPutOI ?? this.latestNormalized?.totalPutOI ?? null,
      previousTotalCallOI: latestSummary?.previousCallOI ?? this.previousNormalized?.totalCallOI ?? null,
      previousTotalPutOI: latestSummary?.previousPutOI ?? this.previousNormalized?.totalPutOI ?? null,
      latestCallOIChangeVal: latestSummary?.callOIChangeVal ?? null,
      latestCallOIChangePct: latestSummary?.callOIChangePct ?? null,
      latestPutOIChangeVal: latestSummary?.putOIChangeVal ?? null,
      latestPutOIChangePct: latestSummary?.putOIChangePct ?? null,
      strikeDetails: latestSummary?.strikeDetails ?? [],
      lastError: this.lastError,
      recentSnapshots: [...this.inMemorySnapshots].reverse().slice(0, 15)
    };
  }

  /**
   * Get all in-memory snapshot records in chronological order, optionally filtered by index.
   */
  public getSnapshots(targetIndex?: SupportedIndex): CollectedSnapshotSummary[] {
    if (targetIndex) {
      return this.inMemorySnapshots.filter((s) => s.index === targetIndex);
    }
    return [...this.inMemorySnapshots];
  }

  /**
   * Clear in-memory collection history (useful for test resets).
   */
  public resetHistory(): void {
    this.inMemorySnapshots = [];
    this.latestNormalized = null;
    this.previousNormalized = null;
    this.lastError = null;
  }
}

export const collectorService = new CollectorService();

