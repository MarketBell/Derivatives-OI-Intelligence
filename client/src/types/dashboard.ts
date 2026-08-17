export type IndexType = 'NIFTY' | 'BANK NIFTY' | 'SENSEX';

export interface OIRow {
  time: string;
  callOI: number;
  putOI: number;
  callChangeVal: number;
  callChangePct: number;
  putChangeVal: number;
  putChangePct: number;
  isHighlighted?: boolean;
}

export interface SummaryMetrics {
  startTime: string;
  endTime: string;
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
  availableDates: string[];
  selectedDate: string;
  timeOptions: string[];
  summary: SummaryMetrics;
  rows: OIRow[];
}

export interface FilterState {
  selectedIndex: IndexType;
  selectedDate: string;
  startTime: string;
  endTime: string;
  quickFilter: '30min' | '1hour' | 'fullday' | 'custom';
}
