import request from 'supertest';
import app from '../index';
import { normalizationService } from '../services/normalizationService';
import { validateNormalizedOptionChain } from '../validation/optionChainValidation';
import { oiCalculationService } from '../services/oiCalculationService';
import { NormalizedOptionChain, RawDhanOptionChain } from '../types/optionChain';

describe('Backend MVP Pipeline Tests', () => {

  describe('1. Normalization Service', () => {
    it('should correctly normalize raw Dhan API v2 response data', () => {
      const mockRawDhanResponse: RawDhanOptionChain = {
        status: 'success',
        data: {
          last_price: 24550.25,
          oc: {
            '24500': {
              ce: { oi: 150000, last_price: 120.5, volume: 5000 },
              pe: { oi: 180000, last_price: 65.0, volume: 7500 }
            },
            '24600': {
              ce: { oi: 200000, last_price: 55.0, volume: 8000 },
              pe: { oi: 110000, last_price: 130.0, volume: 4000 }
            }
          }
        }
      };

      const date = new Date('2026-08-23T09:15:00.000Z');
      const normalized = normalizationService.normalizeDhanResponse(
        mockRawDhanResponse,
        'NIFTY',
        '2026-08-28',
        date
      );

      expect(normalized.index).toBe('NIFTY');
      expect(normalized.expiry).toBe('2026-08-28');
      expect(normalized.totalCallOI).toBe(350000); // 150k + 200k
      expect(normalized.totalPutOI).toBe(290000);  // 180k + 110k
      expect(normalized.strikes.length).toBe(2);
      expect(normalized.strikes[0].strikePrice).toBe(24500);
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
      expect(res.body).toHaveProperty('dhanConfigured');
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

    it('POST /api/option-chain/fetch should handle missing credentials gracefully without failing with 500', async () => {
      const res = await request(app).post('/api/option-chain/fetch').send({ index: 'NIFTY' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending_configuration');
      expect(res.body.configured).toBe(false);
      expect(res.body.message).toContain('Dhan API credentials');
    });

    it('POST /api/option-chain/snapshot should return 400 when given invalid payload', async () => {
      const res = await request(app).post('/api/option-chain/snapshot').send({ invalid: 'data' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

});
