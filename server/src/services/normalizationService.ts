import { SupportedIndex, StrikeData, NormalizedOptionChain, RawDhanOptionChain } from '../types/optionChain';
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
    const strikes = (input.strikes || []).map((s) => ({
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
