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

});
