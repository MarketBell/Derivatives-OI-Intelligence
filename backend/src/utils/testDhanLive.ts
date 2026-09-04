import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { dhanService } from '../services/dhanService';

async function main() {
  console.log('=====================================================');
  console.log('         DHAN LIVE OPTION CHAIN API VERIFICATION     ');
  console.log('=====================================================');

  try {
    console.log('[1/2] Fetching active NIFTY expiries from Dhan API...');
    const expiries = await dhanService.fetchExpiryList('NIFTY');
    console.log(`[Success] Retrieved ${expiries.length} expiries.`);

    console.log('[2/2] Fetching live NIFTY Option Chain...');
    const result = await dhanService.fetchOptionChain('NIFTY', expiries[0]);
    console.log('[Success] Option Chain fetched successfully.');
    console.log(`  Index: ${result.normalized.index}`);
    console.log(`  Expiry: ${result.normalized.expiry}`);
    console.log(`  Strikes Count: ${result.normalized.strikes.length}`);
    console.log(`  Underlying Value: ${result.normalized.underlyingValue}`);
    console.log(`  Total Call OI: ${result.normalized.totalCallOI}`);
    console.log(`  Total Put OI: ${result.normalized.totalPutOI}`);
  } catch (error: any) {
    console.error(`[Verification Result] Request failed: ${error.message}`);
  }
  console.log('=====================================================');
}

main();
