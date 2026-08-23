import { SupportedIndex, IndexDataset, OIRow, SummaryMetrics } from '../types/optionChain';
import { IOptionChainSnapshot } from '../models/OptionChainSnapshot';

export class OICalculationService {
  private round(val: number): number {
    return Math.round(val * 100) / 100;
  }

  private calculatePercentage(change: number, base: number): number {
    if (base === 0) return 0;
    return this.round((change / base) * 100);
  }

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
      const callChangePct = this.calculatePercentage(callChangeVal, baseline.totalCallOI);
      const putChangeVal = this.round(snapshot.totalPutOI - baseline.totalPutOI);
      const putChangePct = this.calculatePercentage(putChangeVal, baseline.totalPutOI);

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
    const callOIChangePct = this.calculatePercentage(callOIChangeVal, startSnap.totalCallOI);
    const putOIChangeVal = this.round(endSnap.totalPutOI - startSnap.totalPutOI);
    const putOIChangePct = this.calculatePercentage(putOIChangeVal, startSnap.totalPutOI);

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
      interimCallOIChangePct = this.calculatePercentage(interimCallOIChangeVal, startSnap.totalCallOI);
      interimPutOIChangeVal = this.round(interimSnap.totalPutOI - startSnap.totalPutOI);
      interimPutOIChangePct = this.calculatePercentage(interimPutOIChangeVal, startSnap.totalPutOI);
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
