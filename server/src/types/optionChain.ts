/**
 * Option Chain Data Types for OI Intelligence Dashboard
 */

export interface OptionChainStrikeData {
  strikePrice: number;
  ceOI: number;
  peOI: number;
  ceOIChange: number;
  peOIChange: number;
  [key: string]: unknown; // Extensible for additional Dhan fields (e.g. IV, volume, LTP)
}

export interface OptionChainData {
  index: string;
  timestamp: string; // ISO 8601 format or timestamp string
  expiry: string;
  strikes: OptionChainStrikeData[];
  [key: string]: unknown; // Extensible for index-level metadata from Dhan API
}

export interface OptionChainResponse {
  success: boolean;
  status: 'ok' | 'pending_configuration' | 'error';
  message?: string;
  configured: boolean;
  data: OptionChainData | null;
  timestamp: string;
}
