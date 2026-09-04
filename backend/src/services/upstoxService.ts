import { upstoxConfig, isUpstoxConfigured } from '../config/upstoxConfig';
import {
  SupportedIndex,
  NormalizedOptionChain,
  RawUpstoxOptionChain,
  RawUpstoxContractsResponse,
  RawUpstoxContractItem
} from '../types/optionChain';
import { normalizationService } from './normalizationService';
import { Logger } from '../utils/logger';

export class UpstoxService {
  private lastRequestTimestamp: number = 0;
  private readonly MIN_REQUEST_INTERVAL_MS = 500; // Throttle to prevent rate limit spikes

  /**
   * Check if Upstox API credentials are present in the environment configuration.
   */
  public isConfigured(): boolean {
    return isUpstoxConfigured();
  }

  /**
   * Rate limit helper
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTimestamp;
    if (elapsed < this.MIN_REQUEST_INTERVAL_MS) {
      const waitTime = this.MIN_REQUEST_INTERVAL_MS - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTimestamp = Date.now();
  }

  /**
   * Fetch active expiry list for an underlying index via GET /v2/option/contract
   */
  public async fetchExpiryList(index: SupportedIndex = 'NIFTY'): Promise<string[]> {
    if (!this.isConfigured()) {
      throw new Error(
        'Upstox API credentials (UPSTOX_ACCESS_TOKEN and UPSTOX_CLIENT_ID) are not configured in environment.'
      );
    }

    await this.enforceRateLimit();

    const instrumentKey = upstoxConfig.instrumentKeys[index] || 'NSE_INDEX|Nifty 50';
    const url = `${upstoxConfig.baseUrl}/v2/option/contract?instrument_key=${encodeURIComponent(instrumentKey)}`;

    Logger.info('UpstoxService', `Fetching option contracts from Upstox API: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${upstoxConfig.accessToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      Logger.error('UpstoxService', `Option Contract API returned HTTP ${response.status}: ${errorText}`);
      throw new Error(`Option Contract API returned status ${response.status}: ${errorText}`);
    }

    const resData: RawUpstoxContractsResponse = await response.json();

    if (resData.status === 'success' && Array.isArray(resData.data)) {
      const expiriesSet = new Set<string>();

      for (const item of resData.data) {
        if (typeof item === 'string') {
          expiriesSet.add(item);
        } else if (item && typeof item === 'object' && 'expiry' in item && typeof item.expiry === 'string') {
          expiriesSet.add(item.expiry);
        }
      }

      const sortedExpiries = Array.from(expiriesSet).sort();
      Logger.info('UpstoxService', `Successfully discovered ${sortedExpiries.length} expiries for ${index}`);
      return sortedExpiries;
    }

    return [];
  }

  /**
   * Fetch Option Chain data from official Upstox API endpoint GET /v2/option/chain.
   *
   * @param index Underlying index symbol ('NIFTY' | 'BANK NIFTY' | 'SENSEX')
   * @param expiry Expiry date string (e.g. "2026-08-28"). If omitted, active expiry is discovered via contract endpoint.
   */
  public async fetchOptionChain(
    index: SupportedIndex = 'NIFTY',
    expiry?: string
  ): Promise<{ raw: RawUpstoxOptionChain; normalized: NormalizedOptionChain }> {
    if (!this.isConfigured()) {
      Logger.warn('UpstoxService', 'Attempted to fetch Option Chain without active Upstox API credentials.');
      throw new Error(
        'Upstox API credentials (UPSTOX_ACCESS_TOKEN and UPSTOX_CLIENT_ID) are not configured in environment.'
      );
    }

    // Automatically resolve valid active expiry if not provided
    let targetExpiry = expiry;
    if (!targetExpiry) {
      const expiries = await this.fetchExpiryList(index);
      if (expiries.length > 0) {
        targetExpiry = expiries[0];
      } else {
        throw new Error(`No active expiries returned for ${index} from Upstox Contract API.`);
      }
    }

    await this.enforceRateLimit();

    const instrumentKey = upstoxConfig.instrumentKeys[index] || 'NSE_INDEX|Nifty 50';
    const url = `${upstoxConfig.baseUrl}/v2/option/chain?instrument_key=${encodeURIComponent(instrumentKey)}&expiry_date=${encodeURIComponent(targetExpiry)}`;

    Logger.info('UpstoxService', `Fetching Option Chain from Upstox API for expiry ${targetExpiry}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${upstoxConfig.accessToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error('UpstoxService', `Upstox API returned HTTP ${response.status}: ${errorText}`);
        throw new Error(`Upstox API returned status ${response.status}: ${errorText}`);
      }

      const rawData: RawUpstoxOptionChain = await response.json();
      Logger.info('UpstoxService', 'Successfully received Option Chain response from Upstox API.');

      const normalized = normalizationService.normalizeUpstoxResponse(rawData, index, targetExpiry);

      return {
        raw: rawData,
        normalized
      };
    } catch (error: any) {
      Logger.error('UpstoxService', `Failed to execute Upstox API fetch: ${error.message}`);
      throw error;
    }
  }
}

export const upstoxService = new UpstoxService();
