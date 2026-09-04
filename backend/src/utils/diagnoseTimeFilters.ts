import { oiCalculationService, parseTimestamp } from '../services/oiCalculationService';
import { normalizationService } from '../services/normalizationService';

function runDiagnosis() {
  console.log('==================================================');
  console.log('      DIAGNOSTIC SUITE: START / END TIME');
  console.log('==================================================\n');

  // Simulated snapshots across a trading session
  const sampleSnapshots = [
    { timeStr: '09:15 AM', totalCallOI: 100000, totalPutOI: 100000 },
    { timeStr: '09:30 AM', totalCallOI: 105000, totalPutOI: 102000 },
    { timeStr: '10:00 AM', totalCallOI: 110000, totalPutOI: 105000 },
    { timeStr: '10:30 AM', totalCallOI: 115000, totalPutOI: 108000 },
    { timeStr: '11:00 AM', totalCallOI: 120000, totalPutOI: 110000 },
    { timeStr: '01:00 PM', totalCallOI: 125000, totalPutOI: 115000 },
    { timeStr: '03:00 PM', totalCallOI: 130000, totalPutOI: 120000 },
    { timeStr: '03:30 PM', totalCallOI: 135000, totalPutOI: 125000 },
    { timeStr: '03:40 PM', totalCallOI: 140000, totalPutOI: 130000 }
  ];

  console.log('--- TEST 1: Exact Range (09:15 AM -> 03:40 PM) ---');
  const res1 = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-08-31', ['2026-08-31'], sampleSnapshots, '09:15 AM', '03:40 PM');
  console.log('Result 1 rows count:', res1.rows.length, '(Expected 9)');
  console.log('Result 1 summary:', res1.summary.startTime, '->', res1.summary.endTime, 'ΔCall:', res1.summary.callOIChangeVal);

  console.log('\n--- TEST 2: Midday Range (10:00 AM -> 11:00 AM) ---');
  const res2 = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-08-31', ['2026-08-31'], sampleSnapshots, '10:00 AM', '11:00 AM');
  console.log('Result 2 rows count:', res2.rows.length, '(Expected 3: 10:00, 10:30, 11:00)');
  console.log('Result 2 rows times:', res2.rows.map(r => r.time));
  console.log('Result 2 summary:', res2.summary.startTime, '->', res2.summary.endTime, 'ΔCall:', res2.summary.callOIChangeVal);

  console.log('\n--- TEST 3: Afternoon Range (03:00 PM -> 03:30 PM) ---');
  const res3 = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-08-31', ['2026-08-31'], sampleSnapshots, '03:00 PM', '03:30 PM');
  console.log('Result 3 rows count:', res3.rows.length, '(Expected 2: 03:00 PM, 03:30 PM)');
  console.log('Result 3 rows times:', res3.rows.map(r => r.time));
  console.log('Result 3 summary:', res3.summary.startTime, '->', res3.summary.endTime);

  console.log('\n--- TEST 4: Same Start and End Time (10:00 AM -> 10:00 AM) ---');
  const res4 = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-08-31', ['2026-08-31'], sampleSnapshots, '10:00 AM', '10:00 AM');
  console.log('Result 4 rows count:', res4.rows.length, '(Expected 1)');
  console.log('Result 4 summary:', res4.summary.startTime, '->', res4.summary.endTime, 'ΔCall:', res4.summary.callOIChangeVal);

  console.log('\n--- TEST 5: Start Time LATER than End Time (03:00 PM -> 10:00 AM) ---');
  try {
    const res5 = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-08-31', ['2026-08-31'], sampleSnapshots, '03:00 PM', '10:00 AM');
    console.log('Result 5 rows count:', res5.rows.length);
  } catch (err: any) {
    console.log('Result 5 threw expected error:', err.message);
  }

  console.log('\n--- TEST 6: 24-Hour Format Input ("10:00" -> "11:00") ---');
  const res6 = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-08-31', ['2026-08-31'], sampleSnapshots, '10:00', '11:00');
  console.log('Result 6 rows count:', res6.rows.length, '(Expected 3, Got:', res6.rows.length, ')');

  console.log('\n--- TEST 7: Intermediate / Non-exact times ("10:15 AM" -> "11:15 AM") ---');
  const res7 = oiCalculationService.calculateTimeSeriesDataset('NIFTY', '2026-08-31', ['2026-08-31'], sampleSnapshots, '10:15 AM', '11:15 AM');
  console.log('Result 7 rows count:', res7.rows.length, '(Expected filtered slice between 10:15 and 11:15, Got:', res7.rows.length, ')');

  console.log('\n--- TEST 8: parseTimestamp utility check ---');
  try {
    console.log('parseTimestamp("09:15 AM"):', parseTimestamp('09:15 AM'));
    console.log('parseTimestamp("03:40 PM"):', parseTimestamp('03:40 PM'));
    console.log('parseTimestamp("15:40"):', parseTimestamp('15:40'));
    console.log('parseTimestamp("09:15"):', parseTimestamp('09:15'));
  } catch (e: any) {
    console.error('parseTimestamp failed on some input:', e.message);
  }
}

runDiagnosis();
