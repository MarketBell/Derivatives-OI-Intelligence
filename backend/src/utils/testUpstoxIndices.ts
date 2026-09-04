import { upstoxService } from '../services/upstoxService';

async function testIndexFetch() {
  for (const idx of ['NIFTY', 'BANK NIFTY', 'SENSEX'] as const) {
    try {
      console.log(`\n--- Fetching Upstox Live for ${idx} ---`);
      const res = await upstoxService.fetchOptionChain(idx);
      console.log(`${idx} Fetch SUCCESS!`);
      console.log(`Spot Price: ₹${res.normalized.underlyingValue}`);
      console.log(`Discovered Expiry: ${res.normalized.expiry}`);
      console.log(`Strikes returned: ${res.normalized.strikes.length}`);
      console.log(`Total Call OI (raw): ${res.normalized.totalCallOI}`);
      console.log(`Total Put OI (raw): ${res.normalized.totalPutOI}`);
    } catch (e: any) {
      console.error(`${idx} Fetch FAILED:`, e.message);
    }
  }
}

testIndexFetch().catch(console.error);
