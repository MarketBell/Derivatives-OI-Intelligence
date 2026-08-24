import {
  calculatePercentageChange,
  calculateFullDayChange,
  calculateOneHourChange,
  calculateFifteenMinuteChange,
  calculateTimeRangeDifference,
  parseTimestamp,
  oiCalculationService
} from '../services/oiCalculationService';
import { OISnapshotData } from '../types/optionChain';

describe('OI Calculation Service Pure Functions', () => {

  describe('1. calculatePercentageChange', () => {
    it('should correctly calculate positive percentage change', () => {
      // 10000 -> 12000 => +20%
      const pct = calculatePercentageChange(12000, 10000);
      expect(pct).toBe(20);
    });

    it('should correctly calculate negative percentage change', () => {
      // 10000 -> 8000 => -20%
      const pct = calculatePercentageChange(8000, 10000);
      expect(pct).toBe(-20);
    });

    it('should return 0 when current equals comparison', () => {
      const pct = calculatePercentageChange(10000, 10000);
      expect(pct).toBe(0);
    });

    it('should handle zero comparison value safely without returning NaN or Infinity', () => {
      const pct = calculatePercentageChange(5000, 0);
      expect(pct).toBe(0);
      expect(Number.isFinite(pct)).toBe(true);
    });

    it('should throw error for invalid or missing numbers', () => {
      expect(() => calculatePercentageChange(NaN, 100)).toThrow('Missing or invalid OI values');
      expect(() => calculatePercentageChange(100, undefined as any)).toThrow('Missing or invalid OI values');
    });
  });

  describe('2. calculateFullDayChange', () => {
    it('should calculate positive CE and PE OI change (Start CE 10000 -> 12000, PE 15000 -> 18000)', () => {
      const start = { ceOI: 10000, peOI: 15000 };
      const current = { ceOI: 12000, peOI: 18000 };

      const result = calculateFullDayChange(current, start);

      expect(result.ceOIChange).toBe(2000);
      expect(result.ceOIChangePct).toBe(20);
      expect(result.peOIChange).toBe(3000);
      expect(result.peOIChangePct).toBe(20);
    });

    it('should calculate negative CE and PE OI change', () => {
      const start = { ceOI: 12000, peOI: 18000 };
      const current = { ceOI: 10000, peOI: 15000 };

      const result = calculateFullDayChange(current, start);

      expect(result.ceOIChange).toBe(-2000);
      expect(result.ceOIChangePct).toBe(-16.67);
      expect(result.peOIChange).toBe(-3000);
      expect(result.peOIChangePct).toBe(-16.67);
    });

    it('should calculate zero change', () => {
      const start = { ceOI: 10000, peOI: 10000 };
      const current = { ceOI: 10000, peOI: 10000 };

      const result = calculateFullDayChange(current, start);

      expect(result.ceOIChange).toBe(0);
      expect(result.ceOIChangePct).toBe(0);
      expect(result.peOIChange).toBe(0);
      expect(result.peOIChangePct).toBe(0);
    });

    it('should work with OISnapshotData structure (totalCallOI / totalPutOI)', () => {
      const start: OISnapshotData = {
        timestamp: '2026-08-24T09:15:00.000Z',
        totalCallOI: 50000,
        totalPutOI: 60000
      };
      const current: OISnapshotData = {
        timestamp: '2026-08-24T15:30:00.000Z',
        totalCallOI: 75000,
        totalPutOI: 45000
      };

      const result = calculateFullDayChange(current, start);

      expect(result.ceOIChange).toBe(25000);
      expect(result.ceOIChangePct).toBe(50);
      expect(result.peOIChange).toBe(-15000);
      expect(result.peOIChangePct).toBe(-25);
    });

    it('should throw error when comparison snapshot is missing', () => {
      expect(() => calculateFullDayChange({ ceOI: 100, peOI: 200 }, null as any)).toThrow('Missing comparison snapshot');
    });

    it('should throw error when OI values are missing', () => {
      expect(() => calculateFullDayChange({ ceOI: undefined as any, peOI: 200 }, { ceOI: 100, peOI: 200 })).toThrow('Missing or invalid OI values');
    });
  });

  describe('3. calculateFifteenMinuteChange', () => {
    const baseTime = new Date('2026-08-24T10:00:00.000Z').getTime();

    const snapshots: OISnapshotData[] = [
      { timestamp: new Date(baseTime).toISOString(), totalCallOI: 100000, totalPutOI: 120000 },
      { timestamp: new Date(baseTime + 15 * 60 * 1000).toISOString(), totalCallOI: 105000, totalPutOI: 118000 },
      { timestamp: new Date(baseTime + 30 * 60 * 1000).toISOString(), totalCallOI: 110000, totalPutOI: 115000 }
    ];

    it('should correctly calculate 15-minute OI change using historical snapshots array', () => {
      const targetTime = new Date(baseTime + 30 * 60 * 1000).toISOString();
      const result = calculateFifteenMinuteChange(snapshots, targetTime);

      // Comparison snapshot is at +15m (105000, 118000). Current is at +30m (110000, 115000)
      expect(result.ceOIChange).toBe(5000); // 110000 - 105000
      expect(result.peOIChange).toBe(-3000); // 115000 - 118000
    });

    it('should work when passing direct 15-minute snapshots pair', () => {
      const snap15mAgo = snapshots[1];
      const snapCurrent = snapshots[2];

      const result = calculateFifteenMinuteChange(snapCurrent, snap15mAgo);
      expect(result.ceOIChange).toBe(5000);
      expect(result.peOIChange).toBe(-3000);
    });

    it('should throw Insufficient historical data error if no snapshot exists 15 minutes prior', () => {
      const targetTime = new Date(baseTime).toISOString(); // No snapshot 15m prior to 10:00
      expect(() => calculateFifteenMinuteChange(snapshots, targetTime)).toThrow('Insufficient historical data');
    });
  });

  describe('4. calculateOneHourChange', () => {
    const baseTime = new Date('2026-08-24T10:00:00.000Z').getTime();

    const snapshots: OISnapshotData[] = [
      { timestamp: new Date(baseTime).toISOString(), totalCallOI: 100000, totalPutOI: 120000 },
      { timestamp: new Date(baseTime + 30 * 60 * 1000).toISOString(), totalCallOI: 110000, totalPutOI: 115000 },
      { timestamp: new Date(baseTime + 60 * 60 * 1000).toISOString(), totalCallOI: 130000, totalPutOI: 110000 }
    ];

    it('should correctly calculate 1-hour OI change using historical snapshots array', () => {
      const targetTime = new Date(baseTime + 60 * 60 * 1000).toISOString();
      const result = calculateOneHourChange(snapshots, targetTime);

      // Comparison snapshot is at +0m (100000, 120000). Current is at +60m (130000, 110000)
      expect(result.ceOIChange).toBe(30000);
      expect(result.peOIChange).toBe(-10000);
    });

    it('should throw Insufficient historical data error if no snapshot exists 1 hour prior', () => {
      const targetTime = new Date(baseTime + 30 * 60 * 1000).toISOString(); // Only 30m of data prior
      expect(() => calculateOneHourChange(snapshots, targetTime)).toThrow('Insufficient historical data');
    });
  });

  describe('5. calculateTimeRangeDifference', () => {
    const t1 = '2026-08-24T09:15:00.000Z';
    const t2 = '2026-08-24T12:00:00.000Z';
    const t3 = '2026-08-24T15:30:00.000Z';

    const snapshots: OISnapshotData[] = [
      { timestamp: t1, totalCallOI: 100000, totalPutOI: 200000 },
      { timestamp: t2, totalCallOI: 140000, totalPutOI: 180000 },
      { timestamp: t3, totalCallOI: 170000, totalPutOI: 150000 }
    ];

    it('should correctly calculate difference between user-selected start and end time', () => {
      const result = calculateTimeRangeDifference(snapshots, t1, t3);
      expect(result.ceOIChange).toBe(70000); // 170000 - 100000
      expect(result.peOIChange).toBe(-50000); // 150000 - 200000
    });

    it('should throw error if end time is earlier than start time', () => {
      expect(() => calculateTimeRangeDifference(snapshots, t3, t1)).toThrow('End time cannot be earlier than start time');
    });

    it('should throw error if start or end timestamp is invalid', () => {
      expect(() => calculateTimeRangeDifference(snapshots, 'invalid-date', t3)).toThrow('Invalid timestamp format');
    });

    it('should throw error if requested time snapshot is not found', () => {
      const nonExistent = '2026-08-24T11:11:11.000Z';
      expect(() => calculateTimeRangeDifference(snapshots, t1, nonExistent)).toThrow('Missing comparison snapshot');
    });
  });

  describe('6. Service class instance compatibility', () => {
    it('should expose methods on oiCalculationService class instance', () => {
      expect(typeof oiCalculationService.calculateFullDayChange).toBe('function');
      expect(typeof oiCalculationService.calculateOneHourChange).toBe('function');
      expect(typeof oiCalculationService.calculateFifteenMinuteChange).toBe('function');
      expect(typeof oiCalculationService.calculateTimeRangeDifference).toBe('function');
      expect(typeof oiCalculationService.calculatePercentageChange).toBe('function');
      expect(typeof oiCalculationService.calculateTimeSeriesDataset).toBe('function');
    });
  });

});
