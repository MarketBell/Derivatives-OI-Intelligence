import { dhanConfig, isDhanConfigured } from '../config/dhanConfig';
import { SupportedIndex, NormalizedOptionChain, RawDhanOptionChain, RawDhanExpiryList } from '../types/optionChain';
import { normalizationService } from './normalizationService';
import { Logger } from '../utils/logger';

export class DhanService {
  private lastRequestTimestamp: number = 0;
  private readonly MIN_REQUEST_INTERVAL_MS = 3000; // Enforce Dhan's 1 request per 3 seconds rate limit

  /**
   * Check if Dhan API credentials are present in the environment configuration.
   */
  public isConfigured(): boolean {
    return isDhanConfigured();
  }

  /**
   * Rate limit helper ensuring at least 3 seconds elapse between Dhan API calls
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTimestamp;
    if (elapsed < this.MIN_REQUEST_INTERVAL_MS) {
      const waitTime = this.MIN_REQUEST_INTERVAL_MS - elapsed;
      Logger.info('DhanService', `Rate limit throttle: Waiting ${waitTime}ms before next Dhan API call.`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTimestamp = Date.now();
  }

  /**
   * Fetch active expiry list for an underlying index via POST /v2/optionchain/expirylist
   */
  public async fetchExpiryList(index: SupportedIndex = 'NIFTY'): Promise<string[]> {
    if (!this.isConfigured()) {
      throw new Error(
        'Dhan API credentials (DHAN_ACCESS_TOKEN and DHAN_CLIENT_ID) are not configured in environment.'
      );
    }

    await this.enforceRateLimit();

    const securityId = dhanConfig.securityIds[index] || 13;
    const url = `${dhanConfig.baseUrl}/v2/optionchain/expirylist`;
    const requestBody = {
      UnderlyingScrip: securityId,
      UnderlyingSeg: 'IDX_I'
    };

    Logger.info('DhanService', `Fetching expiry list from: ${url}`, requestBody);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'access-token': dhanConfig.accessToken,
        'client-id': dhanConfig.clientId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      Logger.error('DhanService', `Expiry List API returned HTTP ${response.status}: ${errorText}`);
      throw new Error(`Expiry List API returned status ${response.status}: ${errorText}`);
    }

    const resData: RawDhanExpiryList = await response.json();
    if (resData.status === 'success' && Array.isArray(resData.data)) {
      return resData.data;
    }

    return [];
  }

  /**
   * Fetch Option Chain data from official Dhan API endpoint POST /v2/optionchain.
   * 
   * @param index Underlying index symbol ('NIFTY' | 'BANK NIFTY' | 'SENSEX')
   * @param expiry Expiry date string (e.g. "2026-08-28"). If omitted, active expiry is dynamically retrieved.
   */
  public async fetchOptionChain(
    index: SupportedIndex = 'NIFTY',
    expiry?: string
  ): Promise<{ raw: RawDhanOptionChain; normalized: NormalizedOptionChain }> {
    if (!this.isConfigured()) {
      Logger.warn('DhanService', 'Attempted to fetch Option Chain without active Dhan API credentials.');
      throw new Error(
        'Dhan API credentials (DHAN_ACCESS_TOKEN and DHAN_CLIENT_ID) are not configured in environment.'
      );
    }

    // Automatically resolve active expiry if not provided
    let targetExpiry = expiry;
    if (!targetExpiry) {
      const expiries = await this.fetchExpiryList(index);
      if (expiries.length > 0) {
        targetExpiry = expiries[0];
      } else {
        throw new Error(`No active expiries returned for ${index} from Dhan Expiry List API.`);
      }
    }

    await this.enforceRateLimit();

    const securityId = dhanConfig.securityIds[index] || 13;
    const url = `${dhanConfig.baseUrl}/v2/optionchain`;

    const requestBody = {
      UnderlyingScrip: securityId,
      UnderlyingSeg: 'IDX_I',
      Expiry: targetExpiry
    };

    Logger.info('DhanService', `Sending POST request to Dhan API endpoint: ${url}`, requestBody);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'access-token': dhanConfig.accessToken,
          'client-id': dhanConfig.clientId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error('DhanService', `Dhan API returned HTTP ${response.status}: ${errorText}`);
        throw new Error(`Dhan API returned status ${response.status}: ${errorText}`);
      }

      const rawData: RawDhanOptionChain = await response.json();
      Logger.info('DhanService', 'Successfully fetched option chain data from Dhan API.');

      const normalized = normalizationService.normalizeDhanResponse(rawData, index, targetExpiry);

      return {
        raw: rawData,
        normalized
      };
    } catch (error: any) {
      Logger.error('DhanService', `Failed to execute Dhan API fetch: ${error.message}`);
      throw error;
    }
  }
}

export const dhanService = new DhanService();
