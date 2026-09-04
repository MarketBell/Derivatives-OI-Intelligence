import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { upstoxService } from '../services/upstoxService';
import { normalizationService } from '../services/normalizationService';
import { oiCalculationService } from '../services/oiCalculationService';

async function audit() {
  console.log('=== UPSTOX LIVE DATA FLOW AUDIT ===\n');

  // 1. Discover expiries
  const expiries = await upstoxService.fetchExpiryList('NIFTY');
  console.log(`Discovered Expiries (${expiries.length}):`, expiries.slice(0, 5));
  const activeExpiry = expiries[0];

  // 2. Fetch live raw and normalized data
  const { raw, normalized } = await upstoxService.fetchOptionChain('NIFTY', activeExpiry);

  console.log('\n--- RAW UPSTOX vs NORMALIZED (5 SAMPLE STRIKES) ---');
  const sampleStrikes = [24000, 24100, 24200, 24300, 24400];
  
  const rawItems = Array.isArray(raw.data) ? raw.data : [];
  
  sampleStrikes.forEach((targetStrike) => {
    const rawItem = rawItems.find((item) => item.strike_price === targetStrike);
    const normItem = normalized.strikes.find((s) => s.strikePrice === targetStrike);

    console.log(`\nStrike ${targetStrike}:`);
    console.log(`  Raw Upstox Strike: ${rawItem?.strike_price}`);
    console.log(`  Raw Upstox Call Market Data:`, rawItem?.call_options?.market_data);
    console.log(`  Raw Upstox Put Market Data:`, rawItem?.put_options?.market_data);
    console.log(`  Normalized CE OI: ${normItem?.ceOI}, PE OI: ${normItem?.peOI}, CE LTP: ${normItem?.ceLTP}, PE LTP: ${normItem?.peLTP}`);
  });

  // 3. Totals Verification
  const calculatedTotalCallOI = normalized.strikes.reduce((sum, s) => sum + s.ceOI, 0);
  const calculatedTotalPutOI = normalized.strikes.reduce((sum, s) => sum + s.peOI, 0);

  console.log('\n--- TOTALS VERIFICATION ---');
  console.log(`Sum of strike ceOI: ${calculatedTotalCallOI}`);
  console.log(`normalized.totalCallOI: ${normalized.totalCallOI}`);
  console.log(`Sum of strike peOI: ${calculatedTotalPutOI}`);
  console.log(`normalized.totalPutOI: ${normalized.totalPutOI}`);
  console.log(`Underlying Spot Price from Upstox: ${normalized.underlyingValue}`);

  // 4. Time & Date
  console.log('\n--- DATE & TIMESTAMP ---');
  console.log(`Normalized Date: ${normalized.dateStr}`);
  console.log(`Normalized Time: ${normalized.timeStr}`);
  console.log(`Normalized Timestamp: ${normalized.timestamp}`);
  console.log(`Normalized Expiry: ${normalized.expiry}`);
}

audit().catch(console.error);
