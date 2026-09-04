export type IndexType = 'NIFTY' | 'BANK NIFTY' | 'SENSEX';

export interface StrikeDetail {
  strikePrice: number;
  isATM: boolean;
  isCallOTM: boolean;
  isPutOTM: boolean;
  ceOI: number;
  peOI: number;
  cePreviousOI?: number;
  pePreviousOI?: number;
  ceOIChange?: number;
  peOIChange?: number;
  ceOIChangePct?: number;
  peOIChangePct?: number;
  ceLTP?: number;
  peLTP?: number;
  ceVolume?: number;
  peVolume?: number;
}

export interface OIRow {
  time: string;
  spotPrice?: number;
  atmStrike?: number;
  callOI: number;
  putOI: number;
  pcr?: number;
  callChangeVal: number;
  callChangePct: number;
  putChangeVal: number;
  putChangePct: number;
  isHighlighted?: boolean;
}

export interface SummaryMetrics {
  startTime: string;
  endTime: string;
  currentExpiry?: string;
  spotPrice?: number;
  atmStrike?: number;
  pcr?: number;
  prevDayCloseCallOI?: number;
  prevDayClosePutOI?: number;
  startCallOI: number;
  startPutOI: number;
  endCallOI: number;
  endPutOI: number;
  callOIChangeVal: number;
  callOIChangePct: number;
  putOIChangeVal: number;
  putOIChangePct: number;
  interimTime?: string;
  interimCallOIChangeVal?: number;
  interimCallOIChangePct?: number;
  interimPutOIChangeVal?: number;
  interimPutOIChangePct?: number;
}

export interface IndexDataset {
  index: IndexType;
  currentExpiry?: string;
  spotPrice?: number;
  atmStrike?: number;
  pcr?: number;
  availableDates: string[];
  selectedDate: string;
  timeOptions: string[];
  summary: SummaryMetrics;
  rows: OIRow[];
  strikeDetails?: StrikeDetail[];
}

export interface FilterState {
  selectedIndex: IndexType;
  selectedDate: string;
  startTime: string;
  endTime: string;
  quickFilter: '30min' | '1hour' | 'fullday' | 'custom';
  frequency?: '1min' | '3min' | '5min';
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  accessType: 'none' | 'paid' | 'admin_free';
  status: 'active' | 'inactive';
  grantedAt?: string;
  expiresAt?: string;
}

export interface CollectorStatusData {
  isRunning: boolean;
  index: IndexType;
  supportedIndices: IndexType[];
  intervalMinutes: number;
  intervalSeconds: number;
  marketHours: {
    isOpen: boolean;
    isWeekday: boolean;
    currentTimeIST: string;
    reason: string;
  };
  snapshotCount: number;
  latestTimestamp: string | null;
  latestDate: string | null;
  latestTime: string | null;
  latestExpiry: string | null;
  latestUnderlyingValue: number | null;
  spotPrice: number | null;
  atmStrike: number | null;
  pcr: number | null;
  latestTotalCallOI: number | null;
  latestTotalPutOI: number | null;
  previousTotalCallOI: number | null;
  previousTotalPutOI: number | null;
  latestCallOIChangeVal: number | null;
  latestCallOIChangePct: number | null;
  latestPutOIChangeVal: number | null;
  latestPutOIChangePct: number | null;
  strikeDetails?: StrikeDetail[];
  lastError: string | null;
  recentSnapshots: Array<{
    timestamp: string;
    timeStr: string;
    spotPrice?: number;
    atmStrike?: number;
    totalCallOI: number;
    totalPutOI: number;
    callOIChangeVal: number;
    putOIChangeVal: number;
    pcr?: number;
  }>;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  accessType: 'none' | 'paid' | 'admin_free';
  picture?: string;
  phone?: string;
}


