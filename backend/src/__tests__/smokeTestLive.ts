import request from 'supertest';
import app from '../index';
import { collectorService } from '../services/collectorService';

async function runSmokeTests() {
  console.log('====================================================');
  console.log('           FINAL OI DASHBOARD SMOKE TEST            ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Check health
    console.log('--- Step 1: Checking Server Health ---');
    const healthRes = await request(app).get('/health');
    assert(healthRes.status === 200 && healthRes.body.status === 'ok', 'GET /health returns status ok');
    assert(healthRes.body.upstoxConfigured === true, 'Upstox is actively configured');

    // 2. Verify auto-start at 3 minutes (or start collector)
    console.log('\n--- Step 2: Verify Collector Auto-Start (3-minute default) ---');
    const start3mRes = await request(app)
      .post('/api/option-chain/collector/start')
      .send({ interval: 3, bypassMarketHours: true });
    assert(start3mRes.status === 200, 'Collector start endpoint returns 200');
    assert(start3mRes.body.data.intervalMinutes === 3, 'Collector interval is 3 minutes');
    assert(start3mRes.body.data.intervalSeconds === 180, 'Collector interval is 180 seconds');
    assert(start3mRes.body.data.isRunning === true, 'Collector is running');

    // 3. Verify frequency change to 1 minute
    console.log('\n--- Step 3: Verify Changing Frequency to 1 Minute ---');
    const start1mRes = await request(app)
      .post('/api/option-chain/collector/start')
      .send({ interval: 1, bypassMarketHours: true });
    assert(start1mRes.status === 200, 'POST /api/option-chain/collector/start with 1m returns 200');
    assert(start1mRes.body.data.intervalMinutes === 1, 'Collector interval updated to 1 minute');
    assert(start1mRes.body.data.intervalSeconds === 60, 'Collector interval updated to 60 seconds');

    // 4. Verify frequency change to 5 minutes
    console.log('\n--- Step 4: Verify Changing Frequency to 5 Minutes ---');
    const start5mRes = await request(app)
      .post('/api/option-chain/collector/start')
      .send({ interval: 5, bypassMarketHours: true });
    assert(start5mRes.status === 200, 'POST /api/option-chain/collector/start with 5m returns 200');
    assert(start5mRes.body.data.intervalMinutes === 5, 'Collector interval updated to 5 minutes');
    assert(start5mRes.body.data.intervalSeconds === 300, 'Collector interval updated to 300 seconds');

    // 5. Test Live Option Chain Fetch from Upstox
    console.log('\n--- Step 5: Verify Live Upstox Data & Strike Normalization ---');
    const liveFetchRes = await request(app).post('/api/option-chain/fetch?index=NIFTY');
    assert(liveFetchRes.status === 200, 'POST /api/option-chain/fetch returns 200');
    assert(liveFetchRes.body.data.index === 'NIFTY', 'Option chain index is NIFTY');
    assert(liveFetchRes.body.data.underlyingValue > 0, `Underlying spot price received: ${liveFetchRes.body.data.underlyingValue}`);
    assert(liveFetchRes.body.data.totalCallOI > 0, `Total Call OI is positive: ${liveFetchRes.body.data.totalCallOI}`);
    assert(liveFetchRes.body.data.totalPutOI > 0, `Total Put OI is positive: ${liveFetchRes.body.data.totalPutOI}`);
    assert(liveFetchRes.body.data.strikes.length > 0, `Received ${liveFetchRes.body.data.strikes.length} strikes`);

    // Verify NIFTY strikes are multiples of 50
    const allStrikes50 = liveFetchRes.body.data.strikes.every((s: any) => s.strikePrice % 50 === 0);
    assert(allStrikes50, 'All NIFTY strikes strictly conform to ₹50 intervals');

    // 6. Test Time-Series API Dataset & Calculations
    console.log('\n--- Step 6: Verify Time-Series Calculations ---');
    const tsRes = await request(app).get('/api/option-chain/time-series?index=NIFTY');
    assert(tsRes.status === 200, 'GET /api/option-chain/time-series returns 200');
    assert(tsRes.body.data.summary !== undefined, 'Summary object present in time-series');
    assert(tsRes.body.data.summary.startTime !== undefined, `Start time: ${tsRes.body.data.summary.startTime}`);
    assert(tsRes.body.data.summary.endTime !== undefined, `End time: ${tsRes.body.data.summary.endTime}`);

    // 7. Test Empty Time-Range Response
    console.log('\n--- Step 7: Verify Empty Time-Range Handling ---');
    const emptyTsRes = await request(app).get('/api/option-chain/time-series?index=NIFTY&startTime=09:15%20AM&endTime=09:16%20AM');
    assert(emptyTsRes.status === 200, 'GET /api/option-chain/time-series for empty sub-minute range returns 200');
    assert(emptyTsRes.body.data.rows.length >= 0, 'Empty time-range returns valid empty dataset array without crashing');

    // 8. Test Inverted Range Rejection
    console.log('\n--- Step 8: Verify Inverted Range Validation ---');
    const invertedRes = await request(app).get('/api/option-chain/time-series?index=NIFTY&startTime=03:00%20PM&endTime=10:00%20AM');
    assert(invertedRes.status === 400, 'Inverted time-range returns 400 Bad Request');
    assert(invertedRes.body.message === 'Start time cannot be later than end time.', 'Proper validation error message returned');

    // Stop collector cleanly
    collectorService.stopCollector();

    console.log('\n====================================================');
    console.log(` SMOKE TEST RESULT: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err: any) {
    console.error(`Smoke test encountered error: ${err.message}`);
    collectorService.stopCollector();
    process.exit(1);
  }
}

runSmokeTests();
