import { SupportedIndex, IndexDataset, OIRow, SummaryMetrics, OIChangeResult, OISnapshotData } from '../types/optionChain';

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
 * Assumed Formula:
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
 * Calculate Full-Day OI Change
 * OI Change = Current/Closing OI - Previous Day Closing OI
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
 * 1H OI Change = Current OI - OI from 1 hour earlier
 * Calculated separately for CE and PE.
 */
export function calculateOneHourChange(
  snapshotsOrCurrent: OISnapshotData[] | OISnapshotData,
  comparisonOrTargetTime?: OISnapshotData | string | Date
): OIChangeResult {
  return calculateWindowChange(snapshotsOrCurrent, 3600000, comparisonOrTargetTime);
}

/**
 * Calculate 15-Minute OI Change
 * 15M OI Change = Current OI - OI from 15 minutes earlier
 * Calculated separately for CE and PE.
 */
export function calculateFifteenMinuteChange(
  snapshotsOrCurrent: OISnapshotData[] | OISnapshotData,
  comparisonOrTargetTime?: OISnapshotData | string | Date
): OIChangeResult {
  return calculateWindowChange(snapshotsOrCurrent, 900000, comparisonOrTargetTime);
}

/**
 * Calculate User-Selected Time Duration Difference
 * Difference = OI at End Time - OI at Start Time
 * Calculated separately for CE and PE.
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

export class OICalculationService {
  private round(val: number): number {
    return Math.round(val * 100) / 100;
  }

  public calculatePercentage(change: number, base: number): number {
    return calculatePercentageChange(base + change, base);
  }

  public calculateFullDayChange = calculateFullDayChange;
  public calculateOneHourChange = calculateOneHourChange;
  public calculateFifteenMinuteChange = calculateFifteenMinuteChange;
  public calculateTimeRangeDifference = calculateTimeRangeDifference;
  public calculatePercentageChange = calculatePercentageChange;

  /**
   * Build complete time-series dataset with summary metrics from snapshot records.
   */
  public calculateTimeSeriesDataset(
    indexSymbol: SupportedIndex,
    dateStr: string,
    availableDates: string[],
    snapshots: Array<{ timeStr: string; totalCallOI: number; totalPutOI: number }>,
    requestedStartTime?: string,
    requestedEndTime?: string
  ): IndexDataset {
    if (!snapshots || snapshots.length === 0) {
      return {
        index: indexSymbol,
        availableDates: availableDates.length > 0 ? availableDates : [dateStr],
        selectedDate: dateStr,
        timeOptions: [],
        summary: {
          startTime: requestedStartTime || '09:15 AM',
          endTime: requestedEndTime || '03:30 PM',
          startCallOI: 0,
          startPutOI: 0,
          endCallOI: 0,
          endPutOI: 0,
          callOIChangeVal: 0,
          callOIChangePct: 0,
          putOIChangeVal: 0,
          putOIChangePct: 0
        },
        rows: []
      };
    }

    // Filter by start and end time if specified
    let filtered = snapshots;
    if (requestedStartTime) {
      const startIndex = filtered.findIndex((s) => s.timeStr === requestedStartTime);
      if (startIndex !== -1) {
        filtered = filtered.slice(startIndex);
      }
    }
    if (requestedEndTime) {
      const endIndex = filtered.findIndex((s) => s.timeStr === requestedEndTime);
      if (endIndex !== -1) {
        filtered = filtered.slice(0, endIndex + 1);
      }
    }

    const baseline = filtered[0];
    const timeOptions = snapshots.map((s) => s.timeStr);

    const rows: OIRow[] = filtered.map((snapshot, idx) => {
      if (idx === 0) {
        return {
          time: snapshot.timeStr,
          callOI: this.round(snapshot.totalCallOI),
          putOI: this.round(snapshot.totalPutOI),
          callChangeVal: 0,
          callChangePct: 0,
          putChangeVal: 0,
          putChangePct: 0
        };
      }

      const callChangeVal = this.round(snapshot.totalCallOI - baseline.totalCallOI);
      const callChangePct = calculatePercentageChange(snapshot.totalCallOI, baseline.totalCallOI);
      const putChangeVal = this.round(snapshot.totalPutOI - baseline.totalPutOI);
      const putChangePct = calculatePercentageChange(snapshot.totalPutOI, baseline.totalPutOI);

      return {
        time: snapshot.timeStr,
        callOI: this.round(snapshot.totalCallOI),
        putOI: this.round(snapshot.totalPutOI),
        callChangeVal,
        callChangePct,
        putChangeVal,
        putChangePct
      };
    });

    const startSnap = filtered[0];
    const endSnap = filtered[filtered.length - 1];

    const callOIChangeVal = this.round(endSnap.totalCallOI - startSnap.totalCallOI);
    const callOIChangePct = calculatePercentageChange(endSnap.totalCallOI, startSnap.totalCallOI);
    const putOIChangeVal = this.round(endSnap.totalPutOI - startSnap.totalPutOI);
    const putOIChangePct = calculatePercentageChange(endSnap.totalPutOI, startSnap.totalPutOI);

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
      interimCallOIChangeVal = this.round(interimSnap.totalCallOI - startSnap.totalCallOI);
      interimCallOIChangePct = calculatePercentageChange(interimSnap.totalCallOI, startSnap.totalCallOI);
      interimPutOIChangeVal = this.round(interimSnap.totalPutOI - startSnap.totalPutOI);
      interimPutOIChangePct = calculatePercentageChange(interimSnap.totalPutOI, startSnap.totalPutOI);
    }

    const summary: SummaryMetrics = {
      startTime: startSnap.timeStr,
      endTime: endSnap.timeStr,
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
      availableDates: availableDates.length > 0 ? availableDates : [dateStr],
      selectedDate: dateStr,
      timeOptions,
      summary,
      rows
    };
  }
}

export const oiCalculationService = new OICalculationService();
