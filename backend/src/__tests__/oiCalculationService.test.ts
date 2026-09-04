import {
  calculatePercentageChange,
  calculateFullDayChange,
  calculateOneHourChange,
  calculateFifteenMinuteChange,
  calculateTimeRangeDifference,
  calculateDynamicATM,
  extractATMPlus4OTM,
  getStrikeSpacing,
  parseTimestamp,
  oiCalculationService
} from '../services/oiCalculationService';
import { OISnapshotData, StrikeData } from '../types/optionChain';

describe('OI Calculation Service Pure Functions', () => {

  describe('0. Dynamic ATM Determination & Strike Spacing', () => {
    it('should return correct strike spacing for indices', () => {
      expect(getStrikeSpacing('NIFTY')).toBe(50);
      expect(getStrikeSpacing('BANK NIFTY')).toBe(100);
      expect(getStrikeSpacing('SENSEX')).toBe(100);
    });

    it('should dynamically calculate ATM from live spot price for NIFTY (50 spacing)', () => {
      // Example from MOM: At 3:00 PM NIFTY = 24211 -> ATM 24200
      expect(calculateDynamicATM(24211, 'NIFTY')).toBe(24200);
      // At 3:05 PM NIFTY = 24245 -> ATM 24250
      expect(calculateDynamicATM(24245, 'NIFTY')).toBe(24250);
      expect(calculateDynamicATM(24225, 'NIFTY')).toBe(24250); // Mid-point rounds up
      expect(calculateDynamicATM(24224, 'NIFTY')).toBe(24200);
    });

    it('should dynamically calculate ATM from live spot price for SENSEX (100 spacing)', () => {
      expect(calculateDynamicATM(80120, 'SENSEX')).toBe(80100);
      expect(calculateDynamicATM(80160, 'SENSEX')).toBe(80200);
    });

    it('should dynamically calculate ATM from live spot price for BANK NIFTY (100 spacing)', () => {
      expect(calculateDynamicATM(51240, 'BANK NIFTY')).toBe(51200);
      expect(calculateDynamicATM(51280, 'BANK NIFTY')).toBe(51300);
    });
  });

  describe('0.1 ATM + 4 OTM Strikes Extraction & PCR', () => {
    it('should extract 5 CE strikes, 5 PE strikes (9 total unique strikes), and calculate PCR', () => {
      const mockStrikes: StrikeData[] = [];
      // Generate strikes from 23800 to 24600 in steps of 50
      for (let s = 23800; s <= 24600; s += 50) {
        mockStrikes.push({
          strikePrice: s,
          ceOI: 10000,
          peOI: 15000,
          cePreviousOI: 9000,
          pePreviousOI: 14000,
          ceLTP: 100,
          peLTP: 100,
          ceVolume: 500,
          peVolume: 500
        });
      }

      // Spot 24211 -> ATM 24200
      const result = extractATMPlus4OTM(mockStrikes, 24211, 'NIFTY');

      expect(result.spotPrice).toBe(24211);
      expect(result.atmStrike).toBe(24200);
      expect(result.strikeSpacing).toBe(50);

      // Call Strikes: ATM, +50, +100, +150, +200 -> 24200, 24250, 24300, 24350, 24400 (5 strikes)
      expect(result.callStrikes).toEqual([24200, 24250, 24300, 24350, 24400]);

      // Put Strikes: ATM, -50, -100, -150, -200 -> 24200, 24150, 24100, 24050, 24000 (5 strikes)
      expect(result.putStrikes).toEqual([24200, 24150, 24100, 24050, 24000]);

      // Relevant 9 strikes: 24000 to 24400
      expect(result.relevantStrikes.length).toBe(9);
      expect(result.strikeDetails.length).toBe(9);

      // Total Call OI = 5 * 10000 = 50000
      expect(result.totalCallOI).toBe(50000);
      // Total Put OI = 5 * 15000 = 75000
      expect(result.totalPutOI).toBe(75000);

      // Previous Day Close: Call = 5 * 9000 = 45000, Put = 5 * 14000 = 70000
      expect(result.prevDayCloseCallOI).toBe(45000);
      expect(result.prevDayClosePutOI).toBe(70000);

      // OI Change vs Prev Day Close: Call = 50000 - 45000 = +5000, Put = 75000 - 70000 = +5000
      expect(result.callOIChangeVal).toBe(5000);
      expect(result.putOIChangeVal).toBe(5000);

      // PCR = Total PE OI / Total CE OI = 75000 / 50000 = 1.5
      expect(result.pcr).toBe(1.5);
    });
  });

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

  describe('7. calculateTimeSeriesDataset range filtering', () => {
    const snapshots = [
      { timeStr: '09:15 AM', totalCallOI: 100000, totalPutOI: 100000 },
      { timeStr: '10:00 AM', totalCallOI: 110000, totalPutOI: 105000 },
      { timeStr: '10:30 AM', totalCallOI: 115000, totalPutOI: 108000 },
      { timeStr: '11:00 AM', totalCallOI: 120000, totalPutOI: 110000 },
      { timeStr: '03:00 PM', totalCallOI: 130000, totalPutOI: 120000 },
      { timeStr: '03:30 PM', totalCallOI: 135000, totalPutOI: 125000 },
      { timeStr: '03:40 PM', totalCallOI: 140000, totalPutOI: 130000 }
    ];

    it('should correctly filter 09:15 AM -> 03:40 PM (full day)', () => {
      const res = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-08-31',
        ['2026-08-31'],
        snapshots,
        '09:15 AM',
        '03:40 PM'
      );
      expect(res.rows.length).toBe(7);
      expect(res.summary.startTime).toBe('09:15 AM');
      expect(res.summary.endTime).toBe('03:40 PM');
    });

    it('should correctly filter 10:00 AM -> 11:00 AM', () => {
      const res = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-08-31',
        ['2026-08-31'],
        snapshots,
        '10:00 AM',
        '11:00 AM'
      );
      expect(res.rows.length).toBe(3);
      expect(res.rows.map((r) => r.time)).toEqual(['10:00 AM', '10:30 AM', '11:00 AM']);
      expect(res.summary.startTime).toBe('10:00 AM');
      expect(res.summary.endTime).toBe('11:00 AM');
    });

    it('should correctly filter 03:00 PM -> 03:30 PM', () => {
      const res = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-08-31',
        ['2026-08-31'],
        snapshots,
        '03:00 PM',
        '03:30 PM'
      );
      expect(res.rows.length).toBe(2);
      expect(res.rows.map((r) => r.time)).toEqual(['03:00 PM', '03:30 PM']);
    });

    it('should handle same start and end time (10:00 AM -> 10:00 AM)', () => {
      const res = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-08-31',
        ['2026-08-31'],
        snapshots,
        '10:00 AM',
        '10:00 AM'
      );
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].time).toBe('10:00 AM');
      expect(res.summary.callOIChangeVal).toBe(0);
    });

    it('should reject inverted range (03:00 PM -> 10:00 AM)', () => {
      expect(() =>
        oiCalculationService.calculateTimeSeriesDataset(
          'NIFTY',
          '2026-08-31',
          ['2026-08-31'],
          snapshots,
          '03:00 PM',
          '10:00 AM'
        )
      ).toThrow('Start time cannot be later than end time');
    });

    it('should handle 24-hour format inputs ("10:00" -> "11:00")', () => {
      const res = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-08-31',
        ['2026-08-31'],
        snapshots,
        '10:00',
        '11:00'
      );
      expect(res.rows.length).toBe(3);
      expect(res.rows.map((r) => r.time)).toEqual(['10:00 AM', '10:30 AM', '11:00 AM']);
    });

    it('should filter non-exact bounds (10:15 AM -> 11:15 AM)', () => {
      const res = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-08-31',
        ['2026-08-31'],
        snapshots,
        '10:15 AM',
        '11:15 AM'
      );
      expect(res.rows.length).toBe(2);
      expect(res.rows.map((r) => r.time)).toEqual(['10:30 AM', '11:00 AM']);
    });
  });

});
