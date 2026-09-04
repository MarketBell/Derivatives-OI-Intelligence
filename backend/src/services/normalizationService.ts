import {
  SupportedIndex,
  StrikeData,
  NormalizedOptionChain,
  RawDhanOptionChain,
  RawUpstoxOptionChain,
  RawUpstoxOptionItem
} from '../types/optionChain';
import { Logger } from '../utils/logger';

export class NormalizationService {
  /**
   * Format Date object to 12-hour string (e.g., "09:15 AM", "03:30 PM")
   */
  public formatTimeStr(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Format Date object to YYYY-MM-DD string
   */
  public formatDateStr(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Filter strikes according to standard Indian Index strike intervals:
   * - NIFTY 50: ₹50 intervals
   * - BANK NIFTY: ₹100 intervals
   * - SENSEX: ₹100 intervals
   */
  public isValidStrikeInterval(index: SupportedIndex, strikePrice: number): boolean {
    if (isNaN(strikePrice) || strikePrice <= 0) return false;
    const rounded = Math.round(strikePrice);
    if (index === 'NIFTY') {
      return rounded % 50 === 0;
    }
    if (index === 'BANK NIFTY' || index === 'SENSEX') {
      return rounded % 100 === 0;
    }
    return true;
  }

  /**
   * Normalize raw Upstox API v2 option chain response into standardized NormalizedOptionChain structure
   */
  public normalizeUpstoxResponse(
    rawResponse: RawUpstoxOptionChain,
    indexSymbol: SupportedIndex,
    expiryStr?: string,
    snapshotTime: Date = new Date()
  ): NormalizedOptionChain {
    Logger.info('NormalizationService', `Normalizing raw Upstox response for index: ${indexSymbol}`);

    const strikes: StrikeData[] = [];
    let totalCallOI = 0;
    let totalPutOI = 0;
    let underlyingValue: number | undefined = undefined;
    let detectedExpiry = expiryStr || '';

    const items: RawUpstoxOptionItem[] = Array.isArray(rawResponse?.data) ? rawResponse.data : [];

    for (const item of items) {
      const strikePrice = Number(item.strike_price);
      if (isNaN(strikePrice) || strikePrice <= 0) continue;

      // Filter to enforce valid standard index strike intervals
      if (!this.isValidStrikeInterval(indexSymbol, strikePrice)) {
        continue;
      }

      if (!detectedExpiry && item.expiry) {
        detectedExpiry = item.expiry;
      }

      if (underlyingValue === undefined && item.underlying_spot_price !== undefined) {
        underlyingValue = Number(item.underlying_spot_price);
      }

      const ceMarket = item.call_options?.market_data;
      const peMarket = item.put_options?.market_data;

      const ceOI = Number(ceMarket?.oi || 0);
      const peOI = Number(peMarket?.oi || 0);
      const cePreviousOI = ceMarket?.prev_oi !== undefined ? Number(ceMarket.prev_oi) : undefined;
      const pePreviousOI = peMarket?.prev_oi !== undefined ? Number(peMarket.prev_oi) : undefined;
      const ceLTP = ceMarket?.ltp !== undefined ? Number(ceMarket.ltp) : undefined;
      const peLTP = peMarket?.ltp !== undefined ? Number(peMarket.ltp) : undefined;
      const ceVolume = ceMarket?.volume !== undefined ? Number(ceMarket.volume) : undefined;
      const peVolume = peMarket?.volume !== undefined ? Number(peMarket.volume) : undefined;

      const ceOIChange = cePreviousOI !== undefined ? ceOI - cePreviousOI : undefined;
      const peOIChange = pePreviousOI !== undefined ? peOI - pePreviousOI : undefined;

      strikes.push({
        strikePrice,
        ceOI,
        peOI,
        cePreviousOI,
        pePreviousOI,
        ceOIChange,
        peOIChange,
        ceLTP,
        peLTP,
        ceVolume,
        peVolume
      });

      totalCallOI += ceOI;
      totalPutOI += peOI;
    }

    // Sort strikes by strike price ascending
    strikes.sort((a, b) => a.strikePrice - b.strikePrice);

    // If underlying spot price is available, calculate dynamic ATM + 4 OTM totals
    if (underlyingValue !== undefined && underlyingValue > 0 && strikes.length > 0) {
      try {
        const { oiCalculationService } = require('./oiCalculationService');
        const atmRes = oiCalculationService.extractATMPlus4OTM(strikes, underlyingValue, indexSymbol);
        totalCallOI = atmRes.totalCallOI;
        totalPutOI = atmRes.totalPutOI;
      } catch (err: any) {
        Logger.warn('NormalizationService', `ATM calculation fallback: ${err.message}`);
      }
    }

    const normalized: NormalizedOptionChain = {
      index: indexSymbol,
      timestamp: snapshotTime.toISOString(),
      dateStr: this.formatDateStr(snapshotTime),
      timeStr: this.formatTimeStr(snapshotTime),
      expiry: detectedExpiry || this.formatDateStr(snapshotTime),
      underlyingValue,
      totalCallOI,
      totalPutOI,
      strikes
    };

    return normalized;
  }

  /**
   * Normalize raw Dhan API v2 response into standardized NormalizedOptionChain structure
   */
  public normalizeDhanResponse(
    rawResponse: RawDhanOptionChain,
    indexSymbol: SupportedIndex,
    expiryStr: string,
    snapshotTime: Date = new Date()
  ): NormalizedOptionChain {
    Logger.info('NormalizationService', `Normalizing raw response for index: ${indexSymbol}`);

    const strikes: StrikeData[] = [];
    let totalCallOI = 0;
    let totalPutOI = 0;

    const ocData = rawResponse?.data?.oc || (rawResponse as any)?.oc;

    if (ocData && typeof ocData === 'object') {
      Object.keys(ocData).forEach((strikeStr) => {
        const strikePrice = parseFloat(strikeStr);
        if (isNaN(strikePrice)) return;

        const strikeObj = ocData[strikeStr];
        const ceOI = Number(strikeObj?.ce?.oi || 0);
        const peOI = Number(strikeObj?.pe?.oi || 0);
        const cePreviousOI = Number(strikeObj?.ce?.previous_oi || 0);
        const pePreviousOI = Number(strikeObj?.pe?.previous_oi || 0);
        const ceSecurityId = strikeObj?.ce?.security_id ? Number(strikeObj?.ce?.security_id) : undefined;
        const peSecurityId = strikeObj?.pe?.security_id ? Number(strikeObj?.pe?.security_id) : undefined;
        const ceLTP = Number(strikeObj?.ce?.last_price || 0);
        const peLTP = Number(strikeObj?.pe?.last_price || 0);
        const ceVolume = Number(strikeObj?.ce?.volume || 0);
        const peVolume = Number(strikeObj?.pe?.volume || 0);

        if (!this.isValidStrikeInterval(indexSymbol, strikePrice)) return;

        strikes.push({
          strikePrice,
          ceOI,
          peOI,
          cePreviousOI,
          pePreviousOI,
          ceSecurityId,
          peSecurityId,
          ceLTP,
          peLTP,
          ceVolume,
          peVolume
        });

        totalCallOI += ceOI;
        totalPutOI += peOI;
      });
    }

    // Sort strikes by strike price ascending
    strikes.sort((a, b) => a.strikePrice - b.strikePrice);

    const underlyingValue = rawResponse?.data?.last_price || (rawResponse as any)?.last_price;

    const normalized: NormalizedOptionChain = {
      index: indexSymbol,
      timestamp: snapshotTime.toISOString(),
      dateStr: this.formatDateStr(snapshotTime),
      timeStr: this.formatTimeStr(snapshotTime),
      expiry: expiryStr,
      underlyingValue: underlyingValue ? Number(underlyingValue) : undefined,
      totalCallOI,
      totalPutOI,
      strikes
    };

    return normalized;
  }

  /**
   * Normalize an already structured snapshot payload or manual input
   */
  public normalizeSnapshotInput(
    input: Partial<NormalizedOptionChain> & { index: SupportedIndex; expiry: string }
  ): NormalizedOptionChain {
    const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();
    const strikes = (input.strikes || [])
      .filter((s) => this.isValidStrikeInterval(input.index, Number(s.strikePrice)))
      .map((s) => ({
        strikePrice: Number(s.strikePrice),
        ceOI: Number(s.ceOI || 0),
        peOI: Number(s.peOI || 0),
        cePreviousOI: s.cePreviousOI !== undefined ? Number(s.cePreviousOI) : 0,
        pePreviousOI: s.pePreviousOI !== undefined ? Number(s.pePreviousOI) : 0,
        ceSecurityId: s.ceSecurityId !== undefined ? Number(s.ceSecurityId) : undefined,
        peSecurityId: s.peSecurityId !== undefined ? Number(s.peSecurityId) : undefined,
        ceLTP: s.ceLTP !== undefined ? Number(s.ceLTP) : 0,
        peLTP: s.peLTP !== undefined ? Number(s.peLTP) : 0,
        ceVolume: s.ceVolume !== undefined ? Number(s.ceVolume) : 0,
        peVolume: s.peVolume !== undefined ? Number(s.peVolume) : 0,
      })).sort((a, b) => a.strikePrice - b.strikePrice);

    const totalCallOI = input.totalCallOI !== undefined
      ? Number(input.totalCallOI)
      : strikes.reduce((sum, s) => sum + s.ceOI, 0);

    const totalPutOI = input.totalPutOI !== undefined
      ? Number(input.totalPutOI)
      : strikes.reduce((sum, s) => sum + s.peOI, 0);

    return {
      index: input.index,
      timestamp: timestamp.toISOString(),
      dateStr: input.dateStr || this.formatDateStr(timestamp),
      timeStr: input.timeStr || this.formatTimeStr(timestamp),
      expiry: input.expiry,
      underlyingValue: input.underlyingValue,
      totalCallOI,
      totalPutOI,
      strikes
    };
  }
}

export const normalizationService = new NormalizationService();
