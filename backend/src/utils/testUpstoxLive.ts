import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { upstoxService } from '../services/upstoxService';
import { isUpstoxConfigured } from '../config/upstoxConfig';
import { validateNormalizedOptionChain } from '../validation/optionChainValidation';
import { oiCalculationService } from '../services/oiCalculationService';

async function main() {
  console.log('=====================================================');
  console.log('        UPSTOX LIVE OPTION CHAIN API VERIFICATION    ');
  console.log('=====================================================');

  const configured = isUpstoxConfigured();
  console.log(`[Step 1] Configuration Check: ${configured ? 'SUCCESS (Credentials present in env)' : 'FAILED (Missing UPSTOX_ACCESS_TOKEN or UPSTOX_CLIENT_ID)'}`);

  if (!configured) {
    console.error('Error: Please ensure UPSTOX_ACCESS_TOKEN and UPSTOX_CLIENT_ID are set in backend/.env');
    process.exit(1);
  }

  try {
    // Step 2: Fetch Active Expiries via Option Contract Endpoint
    console.log('\n[Step 2] Discovering active NIFTY expiries via /v2/option/contract...');
    const expiries = await upstoxService.fetchExpiryList('NIFTY');
    console.log(`[Success] Discovered ${expiries.length} active expiries.`);
    if (expiries.length === 0) {
      throw new Error('No active expiries returned from Upstox contracts endpoint.');
    }
    const selectedExpiry = expiries[0];
    console.log(`  -> Selected nearest active expiry: ${selectedExpiry}`);

    // Step 3: Fetch Real Live Option Chain for the selected expiry
    console.log(`\n[Step 3] Fetching live NIFTY Option Chain for expiry ${selectedExpiry} via /v2/option/chain...`);
    const { raw, normalized } = await upstoxService.fetchOptionChain('NIFTY', selectedExpiry);
    console.log('[Success] Real Upstox Option Chain received.');
    console.log(`  Raw Response Status: ${raw.status}`);
    console.log(`  Raw Records Count: ${Array.isArray(raw.data) ? raw.data.length : 0}`);

    // Inspect first real record structure safely (without sensitive info)
    if (Array.isArray(raw.data) && raw.data.length > 0) {
      const sample = raw.data[0];
      console.log('  Sample Real Upstox Item Fields:', Object.keys(sample).join(', '));
      if (sample.call_options) {
        console.log('  Sample call_options fields:', Object.keys(sample.call_options).join(', '));
        if (sample.call_options.market_data) {
          console.log('  Sample market_data fields:', Object.keys(sample.call_options.market_data).join(', '));
        }
      }
    }

    // Step 4: Validate Normalized Data
    console.log('\n[Step 4] Running runtime Zod validation against normalized data...');
    const validated = validateNormalizedOptionChain(normalized);
    console.log('[Success] Zod schema validation passed successfully!');
    console.log(`  Index: ${validated.index}`);
    console.log(`  Expiry: ${validated.expiry}`);
    console.log(`  Strikes Processed: ${validated.strikes.length}`);
    console.log(`  Underlying Value: ${validated.underlyingValue !== undefined ? validated.underlyingValue : 'N/A'}`);
    console.log(`  Total Call OI: ${validated.totalCallOI.toLocaleString()}`);
    console.log(`  Total Put OI: ${validated.totalPutOI.toLocaleString()}`);

    // Display sample strikes
    console.log('\n  First 3 strikes sample:');
    validated.strikes.slice(0, 3).forEach((s) => {
      console.log(`    Strike ${s.strikePrice}: CE OI = ${s.ceOI.toLocaleString()} (LTP: ${s.ceLTP ?? 0}), PE OI = ${s.peOI.toLocaleString()} (LTP: ${s.peLTP ?? 0})`);
    });

    // Step 5: Test Existing OI Calculation Engine on the live data
    console.log('\n[Step 5] Running OI calculations on real market data...');
    const dummyBaseline = {
      timeStr: '09:15 AM',
      totalCallOI: validated.totalCallOI * 0.98, // Simulated earlier reference point for delta calculation
      totalPutOI: validated.totalPutOI * 0.99
    };
    const currentPoint = {
      timeStr: validated.timeStr,
      totalCallOI: validated.totalCallOI,
      totalPutOI: validated.totalPutOI
    };

    const dataset = oiCalculationService.calculateTimeSeriesDataset(
      'NIFTY',
      validated.dateStr,
      [validated.dateStr],
      [dummyBaseline, currentPoint]
    );

    console.log('[Success] OI calculation completed successfully.');
    console.log(`  Summary Call OI Delta: ${dataset.summary.callOIChangeVal.toLocaleString()} (${dataset.summary.callOIChangePct}%)`);
    console.log(`  Summary Put OI Delta: ${dataset.summary.putOIChangeVal.toLocaleString()} (${dataset.summary.putOIChangePct}%)`);

    console.log('\n=====================================================');
    console.log('     PIPELINE VERIFICATION COMPLETE & SUCCESSFUL!    ');
    console.log('=====================================================');
  } catch (error: any) {
    console.error(`\n[Verification Error] Request failed: ${error.message}`);
    console.log('=====================================================');
    process.exit(1);
  }
}

main();
