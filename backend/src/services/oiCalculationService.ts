import {
  SupportedIndex,
  IndexDataset,
  OIRow,
  SummaryMetrics,
  OIChangeResult,
  OISnapshotData,
  StrikeData,
  StrikeDetail,
  ATMPlus4OTMResult
} from '../types/optionChain';

/**
 * Returns the official strike spacing for a supported index:
 * - NIFTY 50: 50
 * - BANK NIFTY: 100
 * - SENSEX: 100
 */
export function getStrikeSpacing(index: SupportedIndex): number {
  if (index === 'NIFTY') return 50;
  if (index === 'BANK NIFTY' || index === 'SENSEX') return 100;
  return 50;
}

/**
 * Dynamically determines ATM strike from current/live spot price.
 * Example:
 * NIFTY spot = 24211 -> ATM = 24200
 * NIFTY spot = 24245 -> ATM = 24250
 * SENSEX spot = 80120 -> ATM = 80100
 * BANK NIFTY spot = 51280 -> ATM = 51300
 */
export function calculateDynamicATM(spotPrice: number, index: SupportedIndex): number {
  if (isNaN(spotPrice) || spotPrice <= 0) {
    throw new Error('Invalid spot price for ATM determination');
  }
  const spacing = getStrikeSpacing(index);
  return Math.round(spotPrice / spacing) * spacing;
}

/**
 * Extracts the dynamic ATM + 4 OTM strikes for Call side and Put side:
 * - Call Side: ATM, ATM+1*step, ATM+2*step, ATM+3*step, ATM+4*step (5 strikes)
 * - Put Side: ATM, ATM-1*step, ATM-2*step, ATM-3*step, ATM-4*step (5 strikes)
 * - Relevant Total: 9 strikes (from ATM-4*step to ATM+4*step)
 *
 * Calculates:
 * - totalCallOI = Sum of CE OI for the 5 Call strikes
 * - totalPutOI = Sum of PE OI for the 5 Put strikes
 * - prevDayCloseCallOI = Sum of previous-day closing CE OI for the 5 Call strikes
 * - prevDayClosePutOI = Sum of previous-day closing PE OI for the 5 Put strikes
 * - PCR = totalPutOI / totalCallOI
 * - Call OI Change = totalCallOI - prevDayCloseCallOI
 * - Put OI Change = totalPutOI - prevDayClosePutOI
 */
export function extractATMPlus4OTM(
  strikes: StrikeData[],
  spotPrice: number,
  index: SupportedIndex
): ATMPlus4OTMResult {
  const spacing = getStrikeSpacing(index);
  const atmStrike = calculateDynamicATM(spotPrice, index);

  // 5 Call Strikes: ATM, ATM+1, ATM+2, ATM+3, ATM+4
  const callStrikes: number[] = [];
  for (let i = 0; i <= 4; i++) {
    callStrikes.push(atmStrike + i * spacing);
  }

  // 5 Put Strikes: ATM, ATM-1, ATM-2, ATM-3, ATM-4
  const putStrikes: number[] = [];
  for (let i = 0; i <= 4; i++) {
    putStrikes.push(atmStrike - i * spacing);
  }

  // 9 Relevant Strikes sorted ascending from ATM-4 to ATM+4
  const relevantStrikes: number[] = [];
  for (let i = -4; i <= 4; i++) {
    relevantStrikes.push(atmStrike + i * spacing);
  }

  const strikeMap = new Map<number, StrikeData>();
  for (const s of strikes) {
    strikeMap.set(s.strikePrice, s);
  }

  let totalCallOI = 0;
  let prevDayCloseCallOI = 0;
  for (const cStrike of callStrikes) {
    const s = strikeMap.get(cStrike);
    if (s) {
      totalCallOI += s.ceOI || 0;
      prevDayCloseCallOI += s.cePreviousOI !== undefined ? s.cePreviousOI : s.ceOI || 0;
    }
  }

  let totalPutOI = 0;
  let prevDayClosePutOI = 0;
  for (const pStrike of putStrikes) {
    const s = strikeMap.get(pStrike);
    if (s) {
      totalPutOI += s.peOI || 0;
      prevDayClosePutOI += s.pePreviousOI !== undefined ? s.pePreviousOI : s.peOI || 0;
    }
  }

  // Build full 9 strike details
  const strikeDetails: StrikeDetail[] = relevantStrikes.map((strikePrice) => {
    const s = strikeMap.get(strikePrice);
    const isATM = strikePrice === atmStrike;
    const isCallOTM = strikePrice > atmStrike;
    const isPutOTM = strikePrice < atmStrike;

    const ceOI = s?.ceOI || 0;
    const peOI = s?.peOI || 0;
    const cePreviousOI = s?.cePreviousOI !== undefined ? s.cePreviousOI : ceOI;
    const pePreviousOI = s?.pePreviousOI !== undefined ? s.pePreviousOI : peOI;

    const ceOIChange = Math.round((ceOI - cePreviousOI) * 100) / 100;
    const peOIChange = Math.round((peOI - pePreviousOI) * 100) / 100;
    const ceOIChangePct = calculatePercentageChange(ceOI, cePreviousOI);
    const peOIChangePct = calculatePercentageChange(peOI, pePreviousOI);

    return {
      strikePrice,
      isATM,
      isCallOTM,
      isPutOTM,
      ceOI,
      peOI,
      cePreviousOI,
      pePreviousOI,
      ceOIChange,
      peOIChange,
      ceOIChangePct,
      peOIChangePct,
      ceLTP: s?.ceLTP,
      peLTP: s?.peLTP,
      ceVolume: s?.ceVolume,
      peVolume: s?.peVolume
    };
  });

  const callOIChangeVal = Math.round((totalCallOI - prevDayCloseCallOI) * 100) / 100;
  const callOIChangePct = calculatePercentageChange(totalCallOI, prevDayCloseCallOI);
  const putOIChangeVal = Math.round((totalPutOI - prevDayClosePutOI) * 100) / 100;
  const putOIChangePct = calculatePercentageChange(totalPutOI, prevDayClosePutOI);

  const pcr = totalCallOI > 0 ? Math.round((totalPutOI / totalCallOI) * 100) / 100 : 0;

  return {
    spotPrice,
    atmStrike,
    strikeSpacing: spacing,
    callStrikes,
    putStrikes,
    relevantStrikes,
    strikeDetails,
    totalCallOI,
    totalPutOI,
    prevDayCloseCallOI,
    prevDayClosePutOI,
    callOIChangeVal,
    callOIChangePct,
    putOIChangeVal,
    putOIChangePct,
    pcr
  };
}

/**
 * Safely parses a timestamp input (ISO string, HH:MM AM/PM format, or Date object) into Unix epoch ms.
 * Throws Error('Invalid timestamp format') if parsing fails.
 */
export function parseTimestamp(ts: string | Date): number {
  if (ts === null || ts === undefined) {
    throw new Error('Invalid timestamp format');
  }
  if (ts instanceof Date) {
    const time = ts.getTime();
    if (isNaN(time)) throw new Error('Invalid timestamp format');
    return time;
  }
  if (typeof ts === 'string') {
    if (ts.trim() === '') {
      throw new Error('Invalid timestamp format');
    }
    const parsed = Date.parse(ts);
    if (!isNaN(parsed)) return parsed;

    // Handle "HH:MM AM/PM" or "HH:MM" format
    const timeMatch = ts.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3];
      if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
        throw new Error('Invalid timestamp format');
      }
      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
      const d = new Date(1970, 0, 1, hours, minutes, 0);
      return d.getTime();
    }
  }
  throw new Error('Invalid timestamp format');
}

/**
 * Helper to extract CE and PE OI values from snapshot-like objects.
 * Throws appropriate error if missing or invalid.
 */
function extractOIValues(obj: any): { ceOI: number; peOI: number } {
  if (!obj) {
    throw new Error('Missing comparison snapshot');
  }
  const ce = obj.totalCallOI !== undefined ? obj.totalCallOI : (obj.ceOI !== undefined ? obj.ceOI : (obj.callOI !== undefined ? obj.callOI : undefined));
  const pe = obj.totalPutOI !== undefined ? obj.totalPutOI : (obj.peOI !== undefined ? obj.peOI : (obj.putOI !== undefined ? obj.putOI : undefined));

  if (ce === undefined || ce === null || isNaN(Number(ce)) || pe === undefined || pe === null || isNaN(Number(pe))) {
    throw new Error('Missing or invalid OI values');
  }

  return { ceOI: Number(ce), peOI: Number(pe) };
}

/**
 * Calculate Percentage Change
 * 
 * Formula:
 * OI Change % = ((Current OI - Comparison OI) / Comparison OI) × 100
 * 
 * Safely handles zero comparison OI to avoid division-by-zero, returning 0.
 */
export function calculatePercentageChange(currentOI: number, comparisonOI: number): number {
  if (currentOI === undefined || currentOI === null || isNaN(Number(currentOI)) ||
      comparisonOI === undefined || comparisonOI === null || isNaN(Number(comparisonOI))) {
    throw new Error('Missing or invalid OI values');
  }
  const cur = Number(currentOI);
  const comp = Number(comparisonOI);
  if (comp === 0) {
    return 0;
  }
  const changePct = ((cur - comp) / comp) * 100;
  return Math.round(changePct * 100) / 100;
}

/**
 * Calculate Full-Day OI Change against Previous Day Close
 * OI Change = Live OI - Previous Day Closing OI
 * Calculated separately for CE and PE.
 */
export function calculateFullDayChange(
  current: { ceOI?: number; peOI?: number; totalCallOI?: number; totalPutOI?: number } | OISnapshotData,
  previousDayClose: { ceOI?: number; peOI?: number; totalCallOI?: number; totalPutOI?: number } | OISnapshotData
): OIChangeResult {
  if (!current || !previousDayClose) {
    throw new Error('Missing comparison snapshot');
  }
  const curVals = extractOIValues(current);
  const prevVals = extractOIValues(previousDayClose);

  const ceOIChange = Math.round((curVals.ceOI - prevVals.ceOI) * 100) / 100;
  const peOIChange = Math.round((curVals.peOI - prevVals.peOI) * 100) / 100;

  const ceOIChangePct = calculatePercentageChange(curVals.ceOI, prevVals.ceOI);
  const peOIChangePct = calculatePercentageChange(curVals.peOI, prevVals.peOI);

  return {
    ceOIChange,
    peOIChange,
    ceOIChangePct,
    peOIChangePct
  };
}

/**
 * Internal helper to lookup snapshot window and compute delta
 */
function calculateWindowChange(
  snapshotsOrCurrent: OISnapshotData[] | OISnapshotData,
  windowMs: number,
  comparisonOrTargetTime?: OISnapshotData | string | Date
): OIChangeResult {
  if (!snapshotsOrCurrent) {
    throw new Error('Missing comparison snapshot');
  }

  // Case 1: Direct comparison snapshot passed as second argument
  if (!Array.isArray(snapshotsOrCurrent)) {
    if (!comparisonOrTargetTime || typeof comparisonOrTargetTime === 'string' || comparisonOrTargetTime instanceof Date) {
      throw new Error('Missing comparison snapshot');
    }
    return calculateFullDayChange(snapshotsOrCurrent, comparisonOrTargetTime as OISnapshotData);
  }

  // Case 2: Array of snapshots passed
  const snapshots = snapshotsOrCurrent;
  if (snapshots.length === 0) {
    throw new Error('Missing comparison snapshot');
  }

  let targetMs: number;
  if (comparisonOrTargetTime instanceof Date || typeof comparisonOrTargetTime === 'string') {
    targetMs = parseTimestamp(comparisonOrTargetTime);
  } else {
    targetMs = parseTimestamp(snapshots[snapshots.length - 1].timestamp);
  }

  const currentSnap = snapshots.find((s) => parseTimestamp(s.timestamp) === targetMs);
  if (!currentSnap) {
    throw new Error('Missing comparison snapshot');
  }

  const requiredCompMs = targetMs - windowMs;

  // Find comparison snapshot exactly or within tolerance
  const comparisonSnap = snapshots.find((s) => {
    const ts = parseTimestamp(s.timestamp);
    return ts <= requiredCompMs && Math.abs(ts - requiredCompMs) <= 120000; // 2 min tolerance
  });

  if (!comparisonSnap) {
    throw new Error('Insufficient historical data');
  }

  return calculateFullDayChange(currentSnap, comparisonSnap);
}

/**
 * Calculate 1-Hour OI Change
 */
export function calculateOneHourChange(
  snapshotsOrCurrent: OISnapshotData[] | OISnapshotData,
  comparisonOrTargetTime?: OISnapshotData | string | Date
): OIChangeResult {
  return calculateWindowChange(snapshotsOrCurrent, 3600000, comparisonOrTargetTime);
}

/**
 * Calculate 15-Minute OI Change
 */
export function calculateFifteenMinuteChange(
  snapshotsOrCurrent: OISnapshotData[] | OISnapshotData,
  comparisonOrTargetTime?: OISnapshotData | string | Date
): OIChangeResult {
  return calculateWindowChange(snapshotsOrCurrent, 900000, comparisonOrTargetTime);
}

/**
 * Calculate User-Selected Time Duration Difference
 */
export function calculateTimeRangeDifference(
  arg1: OISnapshotData[] | OISnapshotData,
  arg2: OISnapshotData | string | Date,
  arg3?: string | Date
): OIChangeResult {
  if (!arg1 || !arg2) {
    throw new Error('Missing comparison snapshot');
  }

  if (Array.isArray(arg1)) {
    const snapshots = arg1;
    if (snapshots.length === 0) {
      throw new Error('Missing comparison snapshot');
    }
    if (!arg3) {
      throw new Error('Missing comparison snapshot');
    }
    const startMs = parseTimestamp(arg2 as string | Date);
    const endMs = parseTimestamp(arg3 as string | Date);

    if (endMs < startMs) {
      throw new Error('End time cannot be earlier than start time');
    }

    const startSnap = snapshots.find((s) => parseTimestamp(s.timestamp) === startMs);
    const endSnap = snapshots.find((s) => parseTimestamp(s.timestamp) === endMs);

    if (!startSnap || !endSnap) {
      throw new Error('Missing comparison snapshot');
    }

    return calculateFullDayChange(endSnap, startSnap);
  } else {
    const startSnap = arg1 as OISnapshotData;
    const endSnap = arg2 as OISnapshotData;

    if (typeof endSnap === 'string' || endSnap instanceof Date || !endSnap) {
      throw new Error('Missing comparison snapshot');
    }

    if (startSnap.timestamp && endSnap.timestamp) {
      const startMs = parseTimestamp(startSnap.timestamp);
      const endMs = parseTimestamp(endSnap.timestamp);
      if (endMs < startMs) {
        throw new Error('End time cannot be earlier than start time');
      }
    }

    return calculateFullDayChange(endSnap, startSnap);
  }
}

export interface SnapshotInputItem {
  timeStr: string;
  totalCallOI: number;
  totalPutOI: number;
  spotPrice?: number;
  atmStrike?: number;
  pcr?: number;
  expiry?: string;
  previousCallOI?: number;
  previousPutOI?: number;
  callOIChangeVal?: number;
  callOIChangePct?: number;
  putOIChangeVal?: number;
  putOIChangePct?: number;
  strikes?: StrikeData[];
  strikeDetails?: StrikeDetail[];
}

export class OICalculationService {
  private round(val: number): number {
    return Math.round(val * 100) / 100;
  }

  public getStrikeSpacing = getStrikeSpacing;
  public calculateDynamicATM = calculateDynamicATM;
  public extractATMPlus4OTM = extractATMPlus4OTM;
  public calculatePercentage = (change: number, base: number): number => {
    return calculatePercentageChange(base + change, base);
  };
  public calculateFullDayChange = calculateFullDayChange;
  public calculateOneHourChange = calculateOneHourChange;
  public calculateFifteenMinuteChange = calculateFifteenMinuteChange;
  public calculateTimeRangeDifference = calculateTimeRangeDifference;
  public calculatePercentageChange = calculatePercentageChange;

  /**
   * Build complete time-series dataset with summary metrics from snapshot records.
   * Primary OI Change is calculated against Previous Day Closing Baseline.
   */
  public calculateTimeSeriesDataset(
    indexSymbol: SupportedIndex,
    dateStr: string,
    availableDates: string[],
    snapshots: SnapshotInputItem[],
    requestedStartTime?: string,
    requestedEndTime?: string,
    latestExpiry?: string,
    latestStrikeDetails?: StrikeDetail[],
    frequency: '1m' | '3m' | '5m' = '3m'
  ): IndexDataset {
    const timeOptionsSet = new Set<string>();
    timeOptionsSet.add('09:15 AM');
    (snapshots || []).forEach((s) => timeOptionsSet.add(s.timeStr));
    const timeOptions = Array.from(timeOptionsSet);

    if (!snapshots || snapshots.length === 0) {
      return {
        index: indexSymbol,
        currentExpiry: latestExpiry,
        availableDates: availableDates.length > 0 ? availableDates : [dateStr],
        selectedDate: dateStr,
        timeOptions,
        summary: {
          startTime: requestedStartTime || '09:15 AM',
          endTime: requestedEndTime || '03:40 PM',
          startCallOI: 0,
          startPutOI: 0,
          endCallOI: 0,
          endPutOI: 0,
          callOIChangeVal: 0,
          callOIChangePct: 0,
          putOIChangeVal: 0,
          putOIChangePct: 0
        },
        rows: [],
        strikeDetails: latestStrikeDetails || []
      };
    }

    // Default start time to 09:15 AM if not provided
    const effectiveStartTime = requestedStartTime || '09:15 AM';
    const startMs = parseTimestamp(effectiveStartTime);
    const endMs = requestedEndTime ? parseTimestamp(requestedEndTime) : Infinity;

    if (startMs > endMs) {
      throw new Error('Start time cannot be later than end time');
    }

    let filtered = snapshots.filter((s) => {
      const snapMs = parseTimestamp(s.timeStr);
      return snapMs >= startMs && snapMs <= endMs;
    });

    if (filtered.length === 0 && !requestedStartTime) {
      filtered = snapshots;
    }

    if (filtered.length === 0) {
      return {
        index: indexSymbol,
        currentExpiry: latestExpiry,
        availableDates: availableDates.length > 0 ? availableDates : [dateStr],
        selectedDate: dateStr,
        timeOptions,
        summary: {
          startTime: effectiveStartTime,
          endTime: requestedEndTime || '03:40 PM',
          startCallOI: 0,
          startPutOI: 0,
          endCallOI: 0,
          endPutOI: 0,
          callOIChangeVal: 0,
          callOIChangePct: 0,
          putOIChangeVal: 0,
          putOIChangePct: 0
        },
        rows: [],
        strikeDetails: latestStrikeDetails || []
      };
    }

    // Resample according to frequency resolution (1m, 3m default, 5m)
    if (frequency === '3m' || frequency === '5m') {
      const stepMs = (frequency === '3m' ? 3 : 5) * 60 * 1000;
      const sampled: SnapshotInputItem[] = [];
      let lastIncludedMs = -Infinity;
      for (let i = 0; i < filtered.length; i++) {
        const s = filtered[i];
        const snapMs = parseTimestamp(s.timeStr);
        if (i === 0 || i === filtered.length - 1 || snapMs - lastIncludedMs >= stepMs - 15000) {
          sampled.push(s);
          lastIncludedMs = snapMs;
        }
      }
      filtered = sampled;
    }

    const startSnap = filtered[0];
    const endSnap = filtered[filtered.length - 1];

    const rows: OIRow[] = filtered.map((snapshot) => {
      const pcr = snapshot.pcr !== undefined
        ? snapshot.pcr
        : (snapshot.totalCallOI > 0
            ? Math.round((snapshot.totalPutOI / snapshot.totalCallOI) * 100) / 100
            : 0);

      // Primary OI change against previous day closing baseline if present
      let callChangeVal = snapshot.callOIChangeVal !== undefined
        ? snapshot.callOIChangeVal
        : this.round(snapshot.totalCallOI - startSnap.totalCallOI);

      let callChangePct = snapshot.callOIChangePct !== undefined
        ? snapshot.callOIChangePct
        : calculatePercentageChange(snapshot.totalCallOI, startSnap.totalCallOI);

      let putChangeVal = snapshot.putOIChangeVal !== undefined
        ? snapshot.putOIChangeVal
        : this.round(snapshot.totalPutOI - startSnap.totalPutOI);

      let putChangePct = snapshot.putOIChangePct !== undefined
        ? snapshot.putOIChangePct
        : calculatePercentageChange(snapshot.totalPutOI, startSnap.totalPutOI);

      return {
        time: snapshot.timeStr,
        spotPrice: snapshot.spotPrice,
        atmStrike: snapshot.atmStrike,
        callOI: this.round(snapshot.totalCallOI),
        putOI: this.round(snapshot.totalPutOI),
        pcr,
        callChangeVal,
        callChangePct,
        putChangeVal,
        putChangePct
      };
    });

    const callOIChangeVal = endSnap.callOIChangeVal !== undefined
      ? endSnap.callOIChangeVal
      : this.round(endSnap.totalCallOI - startSnap.totalCallOI);

    const callOIChangePct = endSnap.callOIChangePct !== undefined
      ? endSnap.callOIChangePct
      : calculatePercentageChange(endSnap.totalCallOI, startSnap.totalCallOI);

    const putOIChangeVal = endSnap.putOIChangeVal !== undefined
      ? endSnap.putOIChangeVal
      : this.round(endSnap.totalPutOI - startSnap.totalPutOI);

    const putOIChangePct = endSnap.putOIChangePct !== undefined
      ? endSnap.putOIChangePct
      : calculatePercentageChange(endSnap.totalPutOI, startSnap.totalPutOI);

    const summaryPCR = endSnap.pcr !== undefined
      ? endSnap.pcr
      : (endSnap.totalCallOI > 0
          ? Math.round((endSnap.totalPutOI / endSnap.totalCallOI) * 100) / 100
          : 0);

    // Identify interim snapshot if > 2 rows exist
    let interimTime: string | undefined;
    let interimCallOIChangeVal: number | undefined;
    let interimCallOIChangePct: number | undefined;
    let interimPutOIChangeVal: number | undefined;
    let interimPutOIChangePct: number | undefined;

    if (filtered.length > 2) {
      const interimSnap = filtered[filtered.length - 2];
      rows[filtered.length - 2].isHighlighted = true;
      interimTime = interimSnap.timeStr;
      interimCallOIChangeVal = interimSnap.callOIChangeVal !== undefined
        ? interimSnap.callOIChangeVal
        : this.round(interimSnap.totalCallOI - startSnap.totalCallOI);
      interimCallOIChangePct = interimSnap.callOIChangePct !== undefined
        ? interimSnap.callOIChangePct
        : calculatePercentageChange(interimSnap.totalCallOI, startSnap.totalCallOI);
      interimPutOIChangeVal = interimSnap.putOIChangeVal !== undefined
        ? interimSnap.putOIChangeVal
        : this.round(interimSnap.totalPutOI - startSnap.totalPutOI);
      interimPutOIChangePct = interimSnap.putOIChangePct !== undefined
        ? interimSnap.putOIChangePct
        : calculatePercentageChange(interimSnap.totalPutOI, startSnap.totalPutOI);
    }

    const summary: SummaryMetrics = {
      startTime: effectiveStartTime,
      endTime: requestedEndTime || endSnap.timeStr,
      currentExpiry: endSnap.expiry || latestExpiry,
      spotPrice: endSnap.spotPrice,
      atmStrike: endSnap.atmStrike,
      pcr: summaryPCR,
      prevDayCloseCallOI: endSnap.previousCallOI,
      prevDayClosePutOI: endSnap.previousPutOI,
      startCallOI: this.round(startSnap.totalCallOI),
      startPutOI: this.round(startSnap.totalPutOI),
      endCallOI: this.round(endSnap.totalCallOI),
      endPutOI: this.round(endSnap.totalPutOI),
      callOIChangeVal,
      callOIChangePct,
      putOIChangeVal,
      putOIChangePct,
      interimTime,
      interimCallOIChangeVal,
      interimCallOIChangePct,
      interimPutOIChangeVal,
      interimPutOIChangePct
    };

    return {
      index: indexSymbol,
      currentExpiry: endSnap.expiry || latestExpiry,
      spotPrice: endSnap.spotPrice,
      atmStrike: endSnap.atmStrike,
      pcr: summaryPCR,
      availableDates: availableDates.length > 0 ? availableDates : [dateStr],
      selectedDate: dateStr,
      timeOptions,
      summary,
      rows,
      strikeDetails: endSnap.strikeDetails || latestStrikeDetails || []
    };
  }
}

export const oiCalculationService = new OICalculationService();

