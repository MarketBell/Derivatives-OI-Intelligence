# Database Architecture & Schema Status

## Overview

The **OI Intelligence Dashboard** backend uses **MongoDB** (via Mongoose) to store periodic option-chain snapshots collected during market hours.

> [!IMPORTANT]
> **Current Status**: **Active — Connected to MongoDB Atlas**.  
> MongoDB connection setup (`backend/src/config/database.ts`) and snapshot schema (`backend/src/models/OptionChainSnapshot.ts`) are actively used for snapshot persistence.

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

## Database Tasks Status

1. **MongoDB Connection**: Completed. Connected to MongoDB Atlas.
2. **Snapshot Ingestion**: Completed. Automated collector saves normalized snapshots.
3. **Data Retrieval API**: Completed. API queries MongoDB for snapshots.
