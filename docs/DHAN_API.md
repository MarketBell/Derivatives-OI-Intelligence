# Dhan API Integration Documentation

## Overview

The **OI Intelligence Dashboard** is designed to consume real-time and historical Option Chain data for Indian equity indices (NIFTY, BANK NIFTY, SENSEX) fetched via the **Dhan API v2**.

The service layer structure (`backend/src/services/dhanService.ts`) and controller (`backend/src/controllers/optionChainController.ts`) are implemented to interface with Dhan endpoints once live credentials and payloads are mapped.

---

## Integration Status

> [!IMPORTANT]
> **Current Status**: **Structure Prepared (Pending Live Connection)**.  
> Real Dhan API integration is **NOT** completed yet. Live data is not currently being fetched or stored.

- [x] Configuration structure (`backend/src/config/dhanConfig.ts`)
- [x] Environment variable definitions (`backend/.env.example`)
- [x] Service handler wrapper (`backend/src/services/dhanService.ts`)
- [x] Option chain response normalization logic (`backend/src/services/normalizationService.ts`)
- [ ] Live API Access Token & Client ID configuration
- [ ] Final Dhan API endpoint & payload mapping validation against live responses
- [ ] Automated 5-minute fetch scheduler

---

## Credentials & Environment Configuration

The integration requires the following environment variables set in `backend/.env` (see `backend/.env.example` for a template):

```env
DHAN_ACCESS_TOKEN=your_dhan_access_token_here
DHAN_CLIENT_ID=your_dhan_client_id_here
```

> **Security Warning**: Never hardcode credentials in source code or commit `.env` files containing live secrets to git repositories.

---

## Targeted Data Fields

The backend option-chain data layer standardizes Dhan responses into the following fields (`backend/src/types/optionChain.ts`):

1. **Index**: Underlying asset symbol (`NIFTY`, `BANK NIFTY`, `SENSEX`).
2. **Timestamp**: Snapshot ISO timestamp of market data capture.
3. **Expiry**: Option contract expiration date (`YYYY-MM-DD`).
4. **Strike Price**: Contract strike price level.
5. **CE OI**: Call Option Open Interest.
6. **PE OI**: Put Option Open Interest.
7. **CE OI Change**: Call Option Change in Open Interest.
8. **PE OI Change**: Put Option Change in Open Interest.

---

## Planned API Endpoints (Dhan API v2)

- **Option Chain Data**: `POST /v2/optionchain`
- **Expiry List**: `POST /v2/optionchain/expirylist`

Once credentials are provided, `dhanService.ts` will fetch live option chains, pass raw payloads to `normalizationService.ts`, validate outputs using Zod runtime validation, and pass normalized snapshots to the storage and calculation engine.
