import request from 'supertest';
import app from '../index';
import { normalizationService } from '../services/normalizationService';
import { validateNormalizedOptionChain } from '../validation/optionChainValidation';
import { oiCalculationService } from '../services/oiCalculationService';
import { NormalizedOptionChain, RawUpstoxOptionChain } from '../types/optionChain';

describe('Backend MVP Pipeline Tests', () => {

  describe('1. Normalization Service', () => {
    it('should correctly normalize raw Upstox API v2 response data', () => {
      const mockRawUpstoxResponse: RawUpstoxOptionChain = {
        status: 'success',
        data: [
          {
            expiry: '2026-08-28',
            strike_price: 24500,
            underlying_key: 'NSE_INDEX|Nifty 50',
            underlying_spot_price: 24550.25,
            call_options: {
              market_data: {
                oi: 150000,
                prev_oi: 140000,
                ltp: 120.5,
                volume: 5000
              }
            },
            put_options: {
              market_data: {
                oi: 180000,
                prev_oi: 175000,
                ltp: 65.0,
                volume: 7500
              }
            }
          },
          {
            expiry: '2026-08-28',
            strike_price: 24600,
            underlying_key: 'NSE_INDEX|Nifty 50',
            underlying_spot_price: 24550.25,
            call_options: {
              market_data: {
                oi: 200000,
                prev_oi: 190000,
                ltp: 55.0,
                volume: 8000
              }
            },
            put_options: {
              market_data: {
                oi: 110000,
                prev_oi: 115000,
                ltp: 130.0,
                volume: 4000
              }
            }
          }
        ]
      };

      const date = new Date('2026-08-23T09:15:00.000Z');
      const normalized = normalizationService.normalizeUpstoxResponse(
        mockRawUpstoxResponse,
        'NIFTY',
        '2026-08-28',
        date
      );

      expect(normalized.index).toBe('NIFTY');
      expect(normalized.expiry).toBe('2026-08-28');
      expect(normalized.underlyingValue).toBe(24550.25);
      expect(normalized.totalCallOI).toBe(200000); // 150k + 200k
      expect(normalized.totalPutOI).toBe(180000);  // 180k + 110k
      expect(normalized.strikes.length).toBe(2);
      expect(normalized.strikes[0].strikePrice).toBe(24500);
      expect(normalized.strikes[0].ceOIChange).toBe(10000);
      expect(normalized.strikes[1].strikePrice).toBe(24600);
    });

    it('should normalize manual input snapshot data', () => {
      const input = {
        index: 'BANK NIFTY' as const,
        expiry: '2026-08-28',
        timestamp: '2026-08-23T09:30:00.000Z',
        strikes: [
          { strikePrice: 52000, ceOI: 50000, peOI: 60000 }
        ]
      };

      const normalized = normalizationService.normalizeSnapshotInput(input);
      expect(normalized.index).toBe('BANK NIFTY');
      expect(normalized.totalCallOI).toBe(50000);
      expect(normalized.totalPutOI).toBe(60000);
    });
  });

  describe('2. Runtime Validation', () => {
    it('should validate valid normalized option chain data', () => {
      const validData: NormalizedOptionChain = {
        index: 'NIFTY',
        timestamp: '2026-08-23T09:15:00.000Z',
        dateStr: '2026-08-23',
        timeStr: '09:15 AM',
        expiry: '2026-08-28',
        totalCallOI: 100000,
        totalPutOI: 120000,
        strikes: [
          { strikePrice: 24500, ceOI: 50000, peOI: 60000 },
          { strikePrice: 24600, ceOI: 50000, peOI: 60000 }
        ]
      };

      expect(() => validateNormalizedOptionChain(validData)).not.toThrow();
    });

    it('should throw validation error for invalid index or negative values', () => {
      const invalidData = {
        index: 'INVALID_INDEX',
        timestamp: 'invalid-date',
        dateStr: '2026-08-23',
        timeStr: '09:15 AM',
        expiry: '2026-08-28',
        totalCallOI: -100,
        totalPutOI: 120000,
        strikes: []
      };

      expect(() => validateNormalizedOptionChain(invalidData)).toThrow();
    });
  });

  describe('3. OI Calculation Engine', () => {
    it('should accurately calculate delta changes and percentages across time snapshots', () => {
      const snapshots = [
        { timeStr: '09:15 AM', totalCallOI: 100000, totalPutOI: 100000 },
        { timeStr: '09:30 AM', totalCallOI: 110000, totalPutOI: 95000 }, // Call +10k (+10%), Put -5k (-5%)
        { timeStr: '10:00 AM', totalCallOI: 120000, totalPutOI: 90000 }  // Call +20k (+20%), Put -10k (-10%)
      ];

      const dataset = oiCalculationService.calculateTimeSeriesDataset(
        'NIFTY',
        '2026-08-23',
        ['2026-08-23'],
        snapshots
      );

      expect(dataset.index).toBe('NIFTY');
      expect(dataset.rows.length).toBe(3);

      // Baseline row (09:15 AM)
      expect(dataset.rows[0].callChangeVal).toBe(0);
      expect(dataset.rows[0].callChangePct).toBe(0);

      // Interim row (09:30 AM)
      expect(dataset.rows[1].callChangeVal).toBe(10000);
      expect(dataset.rows[1].callChangePct).toBe(10);
      expect(dataset.rows[1].putChangeVal).toBe(-5000);
      expect(dataset.rows[1].putChangePct).toBe(-5);

      // Summary metrics
      expect(dataset.summary.startCallOI).toBe(100000);
      expect(dataset.summary.endCallOI).toBe(120000);
      expect(dataset.summary.callOIChangeVal).toBe(20000);
      expect(dataset.summary.callOIChangePct).toBe(20);
      expect(dataset.summary.putOIChangeVal).toBe(-10000);
      expect(dataset.summary.putOIChangePct).toBe(-10);
    });
  });

  describe('4. REST API Endpoint Tests', () => {
    it('GET /health should return 200 with server status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('dbConnected');
      expect(res.body).toHaveProperty('upstoxConfigured');
    });

    it('GET /api/option-chain should return config and latest snapshot metadata', async () => {
      const res = await request(app).get('/api/option-chain?index=NIFTY');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('configured');
      expect(res.body).toHaveProperty('dbConnected');
    });

    it('GET /api/option-chain/time-series should return frontend-compatible dataset structure', async () => {
      const res = await request(app).get('/api/option-chain/time-series?index=NIFTY');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('index', 'NIFTY');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('rows');
    });

    it('GET /api/option-chain/time-series should return 400 if start time is later than end time', async () => {
      const res = await request(app).get('/api/option-chain/time-series?index=NIFTY&startTime=03:00%20PM&endTime=10:00%20AM');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Start time cannot be later than end time.');
    });

    it('POST /api/option-chain/snapshot should return 400 when given invalid payload', async () => {
      const res = await request(app).post('/api/option-chain/snapshot').send({ invalid: 'data' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/option-chain/collection-status should return status object', async () => {
      const res = await request(app).get('/api/option-chain/collection-status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isRunning');
      expect(res.body.data).toHaveProperty('intervalMinutes');
      expect(res.body.data.intervalMinutes).toBe(3); // Default 3 minutes
      expect(res.body.data).toHaveProperty('snapshotCount');
      expect(res.body.data).toHaveProperty('recentSnapshots');
      expect(res.body.data).toHaveProperty('marketHours');
    });

    it('POST /api/option-chain/collector/start should support 3-minute, 1-minute, and 5-minute intervals', async () => {
      // Test 3-minute (default)
      const res3m = await request(app)
        .post('/api/option-chain/collector/start')
        .send({ interval: 3, bypassMarketHours: true });
      expect(res3m.status).toBe(200);
      expect(res3m.body.data.intervalMinutes).toBe(3);
      expect(res3m.body.data.intervalSeconds).toBe(180);

      // Test 1-minute
      const res1m = await request(app)
        .post('/api/option-chain/collector/start')
        .send({ interval: 1, bypassMarketHours: true });
      expect(res1m.status).toBe(200);
      expect(res1m.body.data.intervalMinutes).toBe(1);
      expect(res1m.body.data.intervalSeconds).toBe(60);

      // Test 5-minute
      const res5m = await request(app)
        .post('/api/option-chain/collector/start')
        .send({ interval: 5, bypassMarketHours: true });
      expect(res5m.status).toBe(200);
      expect(res5m.body.data.intervalMinutes).toBe(5);
      expect(res5m.body.data.intervalSeconds).toBe(300);
    });

    it('GET /api/option-contract should alias /api/option-chain and return metadata', async () => {
      const res = await request(app).get('/api/option-contract?index=NIFTY');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('configured');
    });

    it('GET /api/option-contract/collection-status should return status object', async () => {
      const res = await request(app).get('/api/option-contract/collection-status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isRunning');
    });

    it('GET /api/option-contract/time-series should return dataset', async () => {
      const res = await request(app).get('/api/option-contract/time-series?index=NIFTY');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('index', 'NIFTY');
    });

    it('Should reject invalid or malformed tokens with 401', async () => {
      const res = await request(app)
        .get('/api/subscription/users')
        .set('Authorization', 'Bearer admin_token_demo');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid or expired token.');
    });

    it('Should verify admin JWT token and allow access to admin endpoints', async () => {
      const { jwtService } = require('../services/jwtService');
      const token = jwtService.generateToken('admin-root', 'billionitwealth@gmail.com', 'admin');
      
      const res = await request(app)
        .get('/api/subscription/users')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('5. Strike Interval Enforcement', () => {
    it('should enforce ₹50 strike interval for NIFTY 50', () => {
      expect(normalizationService.isValidStrikeInterval('NIFTY', 24500)).toBe(true);
      expect(normalizationService.isValidStrikeInterval('NIFTY', 24550)).toBe(true);
      expect(normalizationService.isValidStrikeInterval('NIFTY', 24525)).toBe(false);
      expect(normalizationService.isValidStrikeInterval('NIFTY', 24510)).toBe(false);
    });

    it('should enforce ₹100 strike interval for SENSEX', () => {
      expect(normalizationService.isValidStrikeInterval('SENSEX', 80000)).toBe(true);
      expect(normalizationService.isValidStrikeInterval('SENSEX', 80100)).toBe(true);
      expect(normalizationService.isValidStrikeInterval('SENSEX', 80050)).toBe(false);
      expect(normalizationService.isValidStrikeInterval('SENSEX', 80025)).toBe(false);
    });

    it('should enforce ₹100 strike interval for BANK NIFTY', () => {
      expect(normalizationService.isValidStrikeInterval('BANK NIFTY', 52000)).toBe(true);
      expect(normalizationService.isValidStrikeInterval('BANK NIFTY', 52100)).toBe(true);
      expect(normalizationService.isValidStrikeInterval('BANK NIFTY', 52050)).toBe(false);
    });
  });

  describe('6. Market Hours Guard Utility', () => {
    const { isMarketHours, getMarketHoursStatus } = require('../utils/marketHours');

    it('should correctly determine market hours during active weekday trading window (10:30 AM IST)', () => {
      // 10:30 AM IST on a Wednesday (2026-08-26 05:00:00 UTC)
      const openTime = new Date('2026-08-26T05:00:00.000Z');
      expect(isMarketHours(openTime)).toBe(true);
      const status = getMarketHoursStatus(openTime);
      expect(status.isOpen).toBe(true);
      expect(status.isWeekday).toBe(true);
    });

    it('should reject pre-market hours (08:30 AM IST)', () => {
      // 08:30 AM IST on a Wednesday (2026-08-26 03:00:00 UTC)
      const preMarket = new Date('2026-08-26T03:00:00.000Z');
      expect(isMarketHours(preMarket)).toBe(false);
      const status = getMarketHoursStatus(preMarket);
      expect(status.isOpen).toBe(false);
    });

    it('should reject post-market hours (04:00 PM IST)', () => {
      // 04:00 PM IST on a Wednesday (2026-08-26 10:30:00 UTC)
      const postMarket = new Date('2026-08-26T10:30:00.000Z');
      expect(isMarketHours(postMarket)).toBe(false);
      const status = getMarketHoursStatus(postMarket);
      expect(status.isOpen).toBe(false);
    });

    it('should reject weekend trading (Sunday 11:00 AM IST)', () => {
      // 11:00 AM IST on a Sunday (2026-08-23 05:30:00 UTC)
      const weekend = new Date('2026-08-23T05:30:00.000Z');
      expect(isMarketHours(weekend)).toBe(false);
      const status = getMarketHoursStatus(weekend);
      expect(status.isOpen).toBe(false);
      expect(status.isWeekday).toBe(false);
    });
  });

  describe('7. Dynamic ATM & MOM Calculation Logic', () => {
    it('should dynamically calculate ATM from spot price (NIFTY 50 step)', () => {
      expect(oiCalculationService.calculateDynamicATM(24211, 'NIFTY')).toBe(24200);
      expect(oiCalculationService.calculateDynamicATM(24245, 'NIFTY')).toBe(24250);
    });

    it('should dynamically calculate ATM from spot price (SENSEX & BANK NIFTY 100 step)', () => {
      expect(oiCalculationService.calculateDynamicATM(80120, 'SENSEX')).toBe(80100);
      expect(oiCalculationService.calculateDynamicATM(51280, 'BANK NIFTY')).toBe(51300);
    });

    it('should calculate PCR correctly (PE OI / CE OI)', () => {
      const mockStrikes = [
        { strikePrice: 24200, ceOI: 50000, peOI: 75000, cePreviousOI: 45000, pePreviousOI: 70000 },
        { strikePrice: 24250, ceOI: 10000, peOI: 5000, cePreviousOI: 10000, pePreviousOI: 5000 },
        { strikePrice: 24300, ceOI: 10000, peOI: 5000, cePreviousOI: 10000, pePreviousOI: 5000 },
        { strikePrice: 24350, ceOI: 10000, peOI: 5000, cePreviousOI: 10000, pePreviousOI: 5000 },
        { strikePrice: 24400, ceOI: 10000, peOI: 5000, cePreviousOI: 10000, pePreviousOI: 5000 },
        { strikePrice: 24150, ceOI: 5000, peOI: 10000, cePreviousOI: 5000, pePreviousOI: 10000 },
        { strikePrice: 24100, ceOI: 5000, peOI: 10000, cePreviousOI: 5000, pePreviousOI: 10000 },
        { strikePrice: 24050, ceOI: 5000, peOI: 10000, cePreviousOI: 5000, pePreviousOI: 10000 },
        { strikePrice: 24000, ceOI: 5000, peOI: 10000, cePreviousOI: 5000, pePreviousOI: 10000 }
      ];

      const res = oiCalculationService.extractATMPlus4OTM(mockStrikes, 24211, 'NIFTY');
      expect(res.atmStrike).toBe(24200);
      expect(res.totalCallOI).toBe(90000); // 50k + 10k + 10k + 10k + 10k
      expect(res.totalPutOI).toBe(115000); // 75k + 10k + 10k + 10k + 10k
      expect(res.pcr).toBe(Math.round((115000 / 90000) * 100) / 100); // 1.28
    });
  });

  afterAll(() => {
    const { collectorService } = require('../services/collectorService');
    collectorService.stopCollector();
  });

});

