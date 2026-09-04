import app from '../index';
import { normalizationService } from '../services/normalizationService';
import { validateNormalizedOptionChain, safeValidateNormalizedOptionChain } from '../validation/optionChainValidation';
import { oiCalculationService } from '../services/oiCalculationService';
import { subscriptionService } from '../services/subscriptionService';
import { RawDhanOptionChain, NormalizedOptionChain } from '../types/optionChain';

async function runBackendVerification() {
  console.log('====================================================');
  console.log('    BIW OI MANTRA BACKEND FOUNDATION VERIFICATION   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Normalization Tests
  console.log('--- 1. Testing Normalization Service ---');
  try {
    const mockRawDhanResponse: RawDhanOptionChain = {
      status: 'success',
      data: {
        last_price: 24550.25,
        oc: {
          '24500': {
            ce: { oi: 150000, previous_oi: 140000, security_id: 42528, last_price: 120.5, volume: 5000 },
            pe: { oi: 180000, previous_oi: 175000, security_id: 42529, last_price: 65.0, volume: 7500 }
          },
          '24600': {
            ce: { oi: 200000, previous_oi: 190000, security_id: 42530, last_price: 55.0, volume: 8000 },
            pe: { oi: 110000, previous_oi: 105000, security_id: 42531, last_price: 130.0, volume: 4000 }
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

    assert(normalized.index === 'NIFTY', 'Index correctly set to NIFTY');
    assert(normalized.expiry === '2026-08-28', 'Expiry correctly set');
    assert(normalized.totalCallOI === 350000, 'Total Call OI calculation accurate (350,000)');
    assert(normalized.totalPutOI === 290000, 'Total Put OI calculation accurate (290,000)');
    assert(normalized.strikes.length === 2, 'Strike records length matches 2');
    assert(normalized.strikes[0].strikePrice === 24500, 'Strike prices sorted ascending');
    assert(normalized.strikes[0].cePreviousOI === 140000, 'cePreviousOI correctly extracted');
    assert(normalized.strikes[0].pePreviousOI === 175000, 'pePreviousOI correctly extracted');
  } catch (e: any) {
    assert(false, `Normalization threw error: ${e.message}`);
  }

  // 2. Validation Tests
  console.log('\n--- 2. Testing Data Validation ---');
  try {
    const validData: NormalizedOptionChain = {
      index: 'NIFTY',
      timestamp: '2026-08-23T09:15:00.000Z',
      dateStr: '2026-08-23',
      timeStr: '09:15 AM',
      expiry: '2026-08-28',
      totalCallOI: 100000,
      totalPutOI: 120000,
      strikes: [
        { strikePrice: 24500, ceOI: 50000, peOI: 60000, cePreviousOI: 48000, pePreviousOI: 58000 },
        { strikePrice: 24600, ceOI: 50000, peOI: 60000, cePreviousOI: 49000, pePreviousOI: 59000 }
      ]
    };

    const validRes = safeValidateNormalizedOptionChain(validData);
    assert(validRes.success === true, 'Valid payload passes Zod validation');

    const invalidData = {
      index: 'INVALID_INDEX',
      timestamp: 'invalid-date',
      totalCallOI: -100
    };

    const invalidRes = safeValidateNormalizedOptionChain(invalidData);
    assert(invalidRes.success === false, 'Invalid payload fails Zod validation');
  } catch (e: any) {
    assert(false, `Validation threw error: ${e.message}`);
  }

  // 3. OI Calculation Engine Tests
  console.log('\n--- 3. Testing OI Calculation Engine ---');
  try {
    const snapshots = [
      { timeStr: '09:15 AM', totalCallOI: 100000, totalPutOI: 100000 },
      { timeStr: '09:30 AM', totalCallOI: 110000, totalPutOI: 95000 },
      { timeStr: '10:00 AM', totalCallOI: 120000, totalPutOI: 90000 }
    ];

    const dataset = oiCalculationService.calculateTimeSeriesDataset(
      'BANK NIFTY',
      '2026-08-23',
      ['2026-08-23'],
      snapshots
    );

    assert(dataset.index === 'BANK NIFTY', 'Dataset index matches BANK NIFTY');
    assert(dataset.rows.length === 3, 'Dataset rows count matches 3');
    assert(dataset.rows[1].callChangeVal === 10000, 'Row 1 call delta is +10000');
    assert(dataset.rows[1].callChangePct === 10, 'Row 1 call percentage delta is +10%');
  } catch (e: any) {
    assert(false, `OI Calculation engine threw error: ${e.message}`);
  }

  // 4. Subscription & Days Remaining Tests
  console.log('\n--- 4. Testing Subscription & Days Remaining Logic ---');
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const days15 = subscriptionService.calculateRemainingDays(futureDate);
    assert(days15 === 15, 'Dynamic days remaining calculated accurately (15 days)');

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const daysExpired = subscriptionService.calculateRemainingDays(pastDate);
    assert(daysExpired === 0, 'Expired subscription correctly returns 0 days remaining');

    const support = subscriptionService.getSupportDetails();
    assert(support.email === 'billionitwealth@gmail.com', 'Support email matches billionitwealth@gmail.com');
    assert(support.phone === '8527675667', 'Support phone matches 8527675667');
  } catch (e: any) {
    assert(false, `Subscription logic test threw error: ${e.message}`);
  }

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBackendVerification();
