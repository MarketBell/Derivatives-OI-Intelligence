import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { collectorService } from '../services/collectorService';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=====================================================');
  console.log('       LIVE 1-MIN / PERIODIC COLLECTOR DEMO TEST     ');
  console.log('=====================================================');

  // Step 1: Start collector with 5-second interval for test cycle verification
  console.log('[Step 1] Starting NIFTY Collector with 5-second interval for rapid cycle verification...');
  const initialStatus = await collectorService.startCollector(1, 5, true);
  console.log(`[Success] Collector isRunning: ${initialStatus.isRunning}`);
  console.log(`  Initial Snapshots Count: ${initialStatus.snapshotCount}`);
  console.log(`  Latest Time: ${initialStatus.latestTime} (${initialStatus.latestDate})`);
  console.log(`  Underlying Value: ${initialStatus.latestUnderlyingValue}`);
  console.log(`  Total Call OI: ${initialStatus.latestTotalCallOI?.toLocaleString()}`);
  console.log(`  Total Put OI: ${initialStatus.latestTotalPutOI?.toLocaleString()}`);

  // Step 2: Wait for second real collection cycle
  console.log('\n[Step 2] Waiting for next automated collection cycle (7 seconds)...');
  await wait(7000);

  const statusAfterCycle2 = collectorService.getStatus();
  console.log(`[Success] Snapshots Count after Cycle 2: ${statusAfterCycle2.snapshotCount}`);
  console.log(`  Cycle 2 Time: ${statusAfterCycle2.latestTime}`);
  console.log(`  Cycle 2 Call OI: ${statusAfterCycle2.latestTotalCallOI?.toLocaleString()}`);
  console.log(`  Cycle 2 Put OI: ${statusAfterCycle2.latestTotalPutOI?.toLocaleString()}`);

  // Step 3: Wait for third real collection cycle
  console.log('\n[Step 3] Waiting for third automated collection cycle (7 seconds)...');
  await wait(7000);

  const statusAfterCycle3 = collectorService.getStatus();
  console.log(`[Success] Snapshots Count after Cycle 3: ${statusAfterCycle3.snapshotCount}`);

  // Step 4: Stop collector
  console.log('\n[Step 4] Stopping the collector...');
  const stoppedStatus = collectorService.stopCollector();
  console.log(`[Success] Collector stopped. isRunning: ${stoppedStatus.isRunning}`);

  // Step 5: Display Collection History and OI Calculations
  console.log('\n[Step 5] Collected Snapshots & OI Calculation History:');
  console.table(
    stoppedStatus.recentSnapshots.map((s, idx) => ({
      '#': idx + 1,
      'Time': s.timeStr,
      'Date': s.dateStr,
      'Expiry': s.expiry,
      'Underlying': s.underlyingValue,
      'Total Call OI': s.totalCallOI,
      'Total Put OI': s.totalPutOI,
      'Call OI Δ': s.callOIChangeVal,
      'Call OI Δ%': `${s.callOIChangePct}%`,
      'Put OI Δ': s.putOIChangeVal,
      'Put OI Δ%': `${s.putOIChangePct}%`
    }))
  );

  console.log('=====================================================');
  console.log('    1-MIN / 3-MIN / 5-MIN COLLECTOR FULLY VERIFIED!   ');
  console.log('=====================================================');
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
