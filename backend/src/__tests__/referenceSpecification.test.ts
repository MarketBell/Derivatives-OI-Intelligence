import {
  calculateDynamicATM,
  extractATMPlus4OTM,
  getStrikeSpacing,
  calculateFullDayChange,
  calculatePercentageChange,
  oiCalculationService
} from '../services/oiCalculationService';
import { normalizationService } from '../services/normalizationService';
import { StrikeData } from '../types/optionChain';

describe('Reference Image Specification Verification Suite', () => {

  describe('1. ATM Strike Calculation', () => {
    it('should calculate ATM for NIFTY spot 24211 with ₹50 interval to equal 24200', () => {
      expect(getStrikeSpacing('NIFTY')).toBe(50);
      expect(calculateDynamicATM(24211, 'NIFTY')).toBe(24200);
    });

    it('should calculate ATM for NIFTY spot 24245 with ₹50 interval to equal 24250', () => {
      expect(calculateDynamicATM(24245, 'NIFTY')).toBe(24250);
    });

    it('should calculate ATM for SENSEX spot 76245 with ₹100 interval to equal 76200', () => {
      expect(getStrikeSpacing('SENSEX')).toBe(100);
      expect(calculateDynamicATM(76245, 'SENSEX')).toBe(76200);
    });

    it('should calculate ATM for BANK NIFTY spot 51280 with ₹100 interval to equal 51300', () => {
      expect(getStrikeSpacing('BANK NIFTY')).toBe(100);
      expect(calculateDynamicATM(51280, 'BANK NIFTY')).toBe(51300);
    });
  });

  describe('2 & 3. CALL & PUT Strike Selection (ATM + 4 OTM)', () => {
    it('should select 5 CALL strikes ABOVE/AT ATM and 5 PUT strikes BELOW/AT ATM for NIFTY', () => {
      const mockStrikes: StrikeData[] = [
        { strikePrice: 24000, ceOI: 100, peOI: 50000, cePreviousOI: 100, pePreviousOI: 40000 },
        { strikePrice: 24050, ceOI: 200, peOI: 60000, cePreviousOI: 200, pePreviousOI: 50000 },
        { strikePrice: 24100, ceOI: 300, peOI: 70000, cePreviousOI: 300, pePreviousOI: 60000 },
        { strikePrice: 24150, ceOI: 400, peOI: 80000, cePreviousOI: 400, pePreviousOI: 70000 },
        { strikePrice: 24200, ceOI: 100000, peOI: 104000, cePreviousOI: 110000, pePreviousOI: 100000 },
        { strikePrice: 24250, ceOI: 120000, peOI: 500, cePreviousOI: 130000, pePreviousOI: 500 },
        { strikePrice: 24300, ceOI: 150000, peOI: 600, cePreviousOI: 160000, pePreviousOI: 600 },
        { strikePrice: 24350, ceOI: 175000, peOI: 700, cePreviousOI: 170000, pePreviousOI: 700 },
        { strikePrice: 24400, ceOI: 184000, peOI: 800, cePreviousOI: 180000, pePreviousOI: 800 },
      ];

      const res = extractATMPlus4OTM(mockStrikes, 24211, 'NIFTY');

      expect(res.atmStrike).toBe(24200);
      expect(res.callStrikes).toEqual([24200, 24250, 24300, 24350, 24400]);
      expect(res.putStrikes).toEqual([24200, 24150, 24100, 24050, 24000]);
    });

    it('should select 5 CALL strikes ABOVE/AT ATM and 5 PUT strikes BELOW/AT ATM for SENSEX', () => {
      const mockStrikes: StrikeData[] = [
        { strikePrice: 75800, ceOI: 10, peOI: 5000 },
        { strikePrice: 75900, ceOI: 20, peOI: 6000 },
        { strikePrice: 76000, ceOI: 30, peOI: 7000 },
        { strikePrice: 76100, ceOI: 40, peOI: 8000 },
        { strikePrice: 76200, ceOI: 1000, peOI: 9000 },
        { strikePrice: 76300, ceOI: 2000, peOI: 10 },
        { strikePrice: 76400, ceOI: 3000, peOI: 20 },
        { strikePrice: 76500, ceOI: 4000, peOI: 30 },
        { strikePrice: 76600, ceOI: 5000, peOI: 40 },
      ];

      const res = extractATMPlus4OTM(mockStrikes, 76245, 'SENSEX');

      expect(res.atmStrike).toBe(76200);
      expect(res.callStrikes).toEqual([76200, 76300, 76400, 76500, 76600]);
      expect(res.putStrikes).toEqual([76200, 76100, 76000, 75900, 75800]);
    });
  });

  describe('4. Section 13 Critical Example Verification', () => {
    it('should calculate exact values matching the Section 13 reference example', () => {
      // Setup Section 13 data:
      // NIFTY Spot = 24211
      // ATM = 24200
      // CE Strikes: 24200, 24250, 24300, 24350, 24400 -> Sum = 7.29 lakh (729,000)
      // PE Strikes: 24200, 24150, 24100, 24050, 24000 -> Sum = 3.64 lakh (364,000)
      // Prev Day Close CE = 7.50 lakh (750,000) -> CE Change = -0.21 lakh (-21,000)
      // Prev Day Close PE = 3.20 lakh (320,000) -> PE Change = +0.44 lakh (+44,000)

      const mockStrikes: StrikeData[] = [
        // Put OTM strikes
        { strikePrice: 24000, ceOI: 0, peOI: 64000, cePreviousOI: 0, pePreviousOI: 50000 },
        { strikePrice: 24050, ceOI: 0, peOI: 50000, cePreviousOI: 0, pePreviousOI: 40000 },
        { strikePrice: 24100, ceOI: 0, peOI: 50000, cePreviousOI: 0, pePreviousOI: 40000 },
        { strikePrice: 24150, ceOI: 0, peOI: 100000, cePreviousOI: 0, pePreviousOI: 90000 },
        // ATM strike
        { strikePrice: 24200, ceOI: 200000, peOI: 100000, cePreviousOI: 210000, pePreviousOI: 100000 },
        // Call OTM strikes
        { strikePrice: 24250, ceOI: 150000, peOI: 0, cePreviousOI: 160000, pePreviousOI: 0 },
        { strikePrice: 24300, ceOI: 150000, peOI: 0, cePreviousOI: 150000, pePreviousOI: 0 },
        { strikePrice: 24350, ceOI: 129000, peOI: 0, cePreviousOI: 130000, pePreviousOI: 0 },
        { strikePrice: 24400, ceOI: 100000, peOI: 0, cePreviousOI: 100000, pePreviousOI: 0 },
      ];

      const res = extractATMPlus4OTM(mockStrikes, 24211, 'NIFTY');

      expect(res.atmStrike).toBe(24200);
      expect(res.totalCallOI).toBe(729000); // 7.29 lakh
      expect(res.totalPutOI).toBe(364000);  // 3.64 lakh
      expect(res.prevDayCloseCallOI).toBe(750000); // 7.50 lakh
      expect(res.prevDayClosePutOI).toBe(320000);  // 3.20 lakh

      // PCR = 3.64 / 7.29 ≈ 0.50 (0.4993)
      const exactPCR = 364000 / 729000;
      expect(res.pcr).toBe(Math.round(exactPCR * 100) / 100); // 0.5

      // CE OI Change = 7.29 - 7.50 = -0.21 lakh (-21000)
      expect(res.callOIChangeVal).toBe(-21000);

      // PE OI Change = 3.64 - 3.20 = +0.44 lakh (+44000)
      expect(res.putOIChangeVal).toBe(44000);
    });
  });

  describe('5. Baseline & Percentage Change Rules', () => {
    it('should use Previous Day Close as baseline for full day change', () => {
      const current = { totalCallOI: 729000, totalPutOI: 364000 };
      const prevClose = { totalCallOI: 750000, totalPutOI: 320000 };

      const delta = calculateFullDayChange(current, prevClose);

      expect(delta.ceOIChange).toBe(-21000);
      expect(delta.peOIChange).toBe(44000);
      expect(delta.ceOIChangePct).toBe(-2.8);
      expect(delta.peOIChangePct).toBe(13.75);
    });

    it('should handle zero comparison baseline without NaN or Infinity', () => {
      expect(calculatePercentageChange(100, 0)).toBe(0);
    });
  });

  describe('6. Explicit Separation of Snapshot Difference and Full-Day OI Change', () => {
    it('should correctly calculate snapshot step diffs and full-day changes in time series dataset', () => {
      const snapshots = [
        { timeStr: '03:00 PM', totalCallOI: 305500, totalPutOI: 187500, previousCallOI: 320000, previousPutOI: 170000 },
        { timeStr: '03:10 PM', totalCallOI: 277900, totalPutOI: 162200, previousCallOI: 320000, previousPutOI: 170000 },
        { timeStr: '03:15 PM', totalCallOI: 276200, totalPutOI: 165900, previousCallOI: 320000, previousPutOI: 170000 },
      ];

      const dataset = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-09-05',
        ['2026-09-05'],
        snapshots,
        '03:00 PM',
        '03:15 PM',
        '2026-09-10',
        [],
        '1m'
      );

      expect(dataset.rows).toHaveLength(3);
      // Row 0 (03:00 PM):
      expect(dataset.rows[0].callOI).toBe(305500);
      expect(dataset.rows[0].snapshotCallDiff).toBe(0);
      expect(dataset.rows[0].fullDayCallChangeVal).toBe(-14500); // 305500 - 320000

      // Row 1 (03:10 PM):
      expect(dataset.rows[1].callOI).toBe(277900);
      expect(dataset.rows[1].snapshotCallDiff).toBe(-27600); // 277900 - 305500
      expect(dataset.rows[1].snapshotPutDiff).toBe(-25300);  // 162200 - 187500
      expect(dataset.rows[1].fullDayCallChangeVal).toBe(-42100); // 277900 - 320000

      // Row 2 (03:15 PM):
      expect(dataset.rows[2].callOI).toBe(276200);
      expect(dataset.rows[2].snapshotCallDiff).toBe(-1700);  // 276200 - 277900
      expect(dataset.rows[2].snapshotPutDiff).toBe(3700);   // 165900 - 162200
    });

    it('should validate strike interval multiples correctly', () => {
      expect(normalizationService.isValidStrikeInterval('NIFTY', 24200)).toBe(true);
      expect(normalizationService.isValidStrikeInterval('NIFTY', 24225)).toBe(false);
      expect(normalizationService.isValidStrikeInterval('BANK NIFTY', 51300)).toBe(true);
      expect(normalizationService.isValidStrikeInterval('BANK NIFTY', 51350)).toBe(false);
      expect(normalizationService.isValidStrikeInterval('SENSEX', 76200)).toBe(true);
      expect(normalizationService.isValidStrikeInterval('SENSEX', 76250)).toBe(false);
    });
  });

  describe('7. BIW OI Change Specification Verification (Tests 1 - 11)', () => {
    // Shared dataset simulating the specification example:
    // 09:15 AM: Total Call = 2000000 (20 L), Total Put = 1500000 (15 L)
    // 09:18 AM: Total Call = 4500000 (45 L), Total Put = 2000000 (20 L)
    // 09:21 AM: Total Call = 4800000 (48 L), Total Put = 2400000 (24 L)
    // 09:24 AM: Total Call = 4500000 (45 L), Total Put = 2100000 (21 L)
    const specSnapshots = [
      { timeStr: '09:15 AM', totalCallOI: 2000000, totalPutOI: 1500000, previousCallOI: 1800000, previousPutOI: 1400000 },
      { timeStr: '09:18 AM', totalCallOI: 4500000, totalPutOI: 2000000, previousCallOI: 1800000, previousPutOI: 1400000 },
      { timeStr: '09:21 AM', totalCallOI: 4800000, totalPutOI: 2400000, previousCallOI: 1800000, previousPutOI: 1400000 },
      { timeStr: '09:24 AM', totalCallOI: 4500000, totalPutOI: 2100000, previousCallOI: 1800000, previousPutOI: 1400000 },
    ];

    it('TEST 1 & TEST 8: 09:15 baseline is stored correctly and first snapshot has null Difference', () => {
      const dataset = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-09-05',
        ['2026-09-05'],
        specSnapshots,
        '09:15 AM',
        '09:24 AM',
        '2026-09-10',
        [],
        '3m'
      );

      const r0915 = dataset.rows[0];
      expect(r0915.time).toBe('09:15 AM');
      expect(r0915.callOI).toBe(2000000);
      expect(r0915.putOI).toBe(1500000);
      expect(r0915.callOIChange).toBe(0);
      expect(r0915.putOIChange).toBe(0);
      expect(r0915.callDifference).toBeNull();
      expect(r0915.putDifference).toBeNull();
    });

    it('TEST 2: 09:18 Call OI Change: 45 L - 20 L = +25 L', () => {
      const dataset = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-09-05',
        ['2026-09-05'],
        specSnapshots,
        '09:15 AM',
        '09:24 AM',
        '2026-09-10',
        [],
        '3m'
      );

      const r0918 = dataset.rows[1];
      expect(r0918.time).toBe('09:18 AM');
      expect(r0918.callOIChange).toBe(2500000); // 45 L - 20 L = +25 L
    });

    it('TEST 3: 09:21 Call OI Change: 48 L - 20 L = +28 L', () => {
      const dataset = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-09-05',
        ['2026-09-05'],
        specSnapshots,
        '09:15 AM',
        '09:24 AM',
        '2026-09-10',
        [],
        '3m'
      );

      const r0921 = dataset.rows[2];
      expect(r0921.time).toBe('09:21 AM');
      expect(r0921.callOIChange).toBe(2800000); // 48 L - 20 L = +28 L
    });

    it('TEST 4: 09:21 Call Difference: 28 L - 25 L = +3 L', () => {
      const dataset = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-09-05',
        ['2026-09-05'],
        specSnapshots,
        '09:15 AM',
        '09:24 AM',
        '2026-09-10',
        [],
        '3m'
      );

      const r0921 = dataset.rows[2];
      expect(r0921.callDifference).toBe(300000); // 28 L - 25 L = +3 L
    });

    it('TEST 5: 09:24 Call OI Change: 45 L - 20 L = +25 L', () => {
      const dataset = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-09-05',
        ['2026-09-05'],
        specSnapshots,
        '09:15 AM',
        '09:24 AM',
        '2026-09-10',
        [],
        '3m'
      );

      const r0924 = dataset.rows[3];
      expect(r0924.time).toBe('09:24 AM');
      expect(r0924.callOIChange).toBe(2500000); // 45 L - 20 L = +25 L
    });

    it('TEST 6: 09:24 Call Difference: 25 L - 28 L = -3 L', () => {
      const dataset = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-09-05',
        ['2026-09-05'],
        specSnapshots,
        '09:15 AM',
        '09:24 AM',
        '2026-09-10',
        [],
        '3m'
      );

      const r0924 = dataset.rows[3];
      expect(r0924.callDifference).toBe(-300000); // 25 L - 28 L = -3 L
    });

    it('TEST 7: Equivalent Put calculations', () => {
      const dataset = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-09-05',
        ['2026-09-05'],
        specSnapshots,
        '09:15 AM',
        '09:24 AM',
        '2026-09-10',
        [],
        '3m'
      );

      // 09:15 Put OI = 15 L -> Put OI Change = 0, Put Difference = null
      expect(dataset.rows[0].putOIChange).toBe(0);
      expect(dataset.rows[0].putDifference).toBeNull();

      // 09:18 Put OI = 20 L -> Put OI Change = 20 - 15 = +5 L, Put Difference = 5 - 0 = +5 L
      expect(dataset.rows[1].putOIChange).toBe(500000);
      expect(dataset.rows[1].putDifference).toBe(500000);

      // 09:21 Put OI = 24 L -> Put OI Change = 24 - 15 = +9 L, Put Difference = 9 - 5 = +4 L
      expect(dataset.rows[2].putOIChange).toBe(900000);
      expect(dataset.rows[2].putDifference).toBe(400000);

      // 09:24 Put OI = 21 L -> Put OI Change = 21 - 15 = +6 L, Put Difference = 6 - 9 = -3 L
      expect(dataset.rows[3].putOIChange).toBe(600000);
      expect(dataset.rows[3].putDifference).toBe(-300000);
    });

    it('TEST 9: Changing frequency from 1m to 3m to 5m works correctly', () => {
      const minuteSnapshots = [
        { timeStr: '09:15 AM', totalCallOI: 1000, totalPutOI: 1000 },
        { timeStr: '09:16 AM', totalCallOI: 1100, totalPutOI: 1100 },
        { timeStr: '09:17 AM', totalCallOI: 1200, totalPutOI: 1200 },
        { timeStr: '09:18 AM', totalCallOI: 1300, totalPutOI: 1300 },
        { timeStr: '09:19 AM', totalCallOI: 1400, totalPutOI: 1400 },
        { timeStr: '09:20 AM', totalCallOI: 1500, totalPutOI: 1500 },
      ];

      const ds1m = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-09-05', ['2026-09-05'], minuteSnapshots, '09:15 AM', '09:20 AM', '2026-09-10', [], '1m');
      expect(ds1m.rows).toHaveLength(6);

      const ds3m = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-09-05', ['2026-09-05'], minuteSnapshots, '09:15 AM', '09:20 AM', '2026-09-10', [], '3m');
      expect(ds3m.rows).toHaveLength(3); // 09:15, 09:18, 09:20

      const ds5m = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-09-05', ['2026-09-05'], minuteSnapshots, '09:15 AM', '09:20 AM', '2026-09-10', [], '5m');
      expect(ds5m.rows).toHaveLength(2); // 09:15, 09:20
    });

    it('TEST 10: Baseline resets on a new trading day', () => {
      const day1Snapshots = [
        { timeStr: '09:15 AM', totalCallOI: 500000, totalPutOI: 400000 },
        { timeStr: '09:18 AM', totalCallOI: 600000, totalPutOI: 450000 },
      ];

      const day2Snapshots = [
        { timeStr: '09:15 AM', totalCallOI: 700000, totalPutOI: 800000 },
        { timeStr: '09:18 AM', totalCallOI: 750000, totalPutOI: 820000 },
      ];

      const dsDay1 = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-09-05', ['2026-09-05'], day1Snapshots, '09:15 AM', '09:18 AM', '2026-09-10', [], '3m');
      const dsDay2 = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-09-06', ['2026-09-06'], day2Snapshots, '09:15 AM', '09:18 AM', '2026-09-10', [], '3m');

      expect(dsDay1.rows[1].callOIChange).toBe(100000); // 600k - 500k
      expect(dsDay2.rows[1].callOIChange).toBe(50000);   // 750k - 700k (reset to Day 2 09:15 baseline)
    });

    it('TEST 11: The OI Change calculation does NOT use previous-day closing OI', () => {
      const snapshotsWithPrevDayClose = [
        { timeStr: '09:15 AM', totalCallOI: 2000000, totalPutOI: 1500000, previousCallOI: 3000000, previousPutOI: 2500000 },
        { timeStr: '09:18 AM', totalCallOI: 2500000, totalPutOI: 1800000, previousCallOI: 3000000, previousPutOI: 2500000 },
      ];

      const dataset = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-09-05',
        ['2026-09-05'],
        snapshotsWithPrevDayClose,
        '09:15 AM',
        '09:18 AM',
        '2026-09-10',
        [],
        '3m'
      );

      // At 09:18 AM:
      // Call OI Change MUST be 2500000 - 2000000 (09:15 baseline) = +500,000
      // NOT 2500000 - 3000000 (previous day close) = -500,000
      expect(dataset.rows[1].callOIChange).toBe(500000);
      expect(dataset.rows[1].callOIChange).not.toBe(-500000);
    });
  });

});
