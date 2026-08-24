# Database Architecture & Schema Status

## Overview

The **OI Intelligence Dashboard** backend uses **MongoDB** (via Mongoose) to store periodic option-chain snapshots collected during market hours.

> [!IMPORTANT]
> **Current Status**: **Schema Prepared (Connection & Persistence Pending)**.  
> MongoDB connection setup (`server/src/config/database.ts`) and snapshot schema (`server/src/models/OptionChainSnapshot.ts`) exist in the codebase, but active database connection and live background snapshot persistence are **NOT** completed yet.

---

## Snapshot Data Model Schema

Snapshots are structured in MongoDB under the `option_chain_snapshots` collection:

```typescript
export interface IOptionChainSnapshot {
  index: 'NIFTY' | 'BANK NIFTY' | 'SENSEX';
  timestamp: Date;
  dateStr: string;      // "YYYY-MM-DD"
  timeStr: string;      // "HH:MM AM/PM"
  expiry: string;       // "YYYY-MM-DD"
  underlyingValue?: number;
  totalCallOI: number;
  totalPutOI: number;
  strikes: Array<{
    strikePrice: number;
    ceOI: number;
    peOI: number;
    cePreviousOI?: number;
    pePreviousOI?: number;
    ceOIChange?: number;
    peOIChange?: number;
    ceLTP?: number;
    peLTP?: number;
    ceVolume?: number;
    peVolume?: number;
  }>;
}
```

---

## MongoDB Indexes

The collection is indexed for high-performance time-series queries:
- Compound Index: `{ index: 1, dateStr: 1, timeStr: 1 }`
- Compound Index: `{ index: 1, timestamp: -1 }`

---

## Pending Database Tasks

1. **MongoDB Connection**: Configure `MONGODB_URI` environment variable and enable active DB connection.
2. **Snapshot Ingestion**: Wire automated 5-minute collector to save normalized snapshots into MongoDB.
3. **Data Retrieval API**: Connect MongoDB snapshot queries directly into `oiCalculationService.ts` for live frontend API endpoints.
