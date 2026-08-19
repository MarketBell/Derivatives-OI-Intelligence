# Dhan API Integration Documentation

## Overview

The **OI Intelligence Dashboard** relies on real-time and historical Option Chain data for Indian indices (such as NIFTY and BANKNIFTY) fetched via the **Dhan API**. 

The backend service (`server/src/services/dhanService.ts`) is designed to communicate securely with Dhan endpoints using API credentials provided via environment variables.

---

## Credentials & Authentication

The integration requires the following environment variables set in `server/.env`:

- `DHAN_ACCESS_TOKEN`: API Access Token issued by Dhan.
- `DHAN_CLIENT_ID`: Dhan Client Identifier.

> **Security Warning**: Never hardcode credentials in source code or commit `.env` files to git repositories.

---

## Required Dashboard Option-Chain Fields

The OI Intelligence Dashboard consumes structured option-chain data. The backend maps Dhan responses to extract the following essential fields:

1. **Index**: Underlying asset symbol (e.g., `NIFTY`, `BANKNIFTY`).
2. **Timestamp**: Snapshot timestamp of market data capture.
3. **Expiry**: Option contract expiration date.
4. **Strike Price**: Contract strike price level.
5. **CE OI**: Call Option Open Interest.
6. **PE OI**: Put Option Open Interest.
7. **CE OI Change**: Call Option Change in Open Interest.
8. **PE OI Change**: Put Option Change in Open Interest.

The TypeScript interface `OptionChainStrikeData` in `server/src/types/optionChain.ts` supports these core metrics while permitting additional response attributes (`[key: string]: unknown`) for future expansion (such as Implied Volatility or Volume).

---

## Endpoint Mapping Status

- **Status**: Pending final API response inspection.
- The service structure (`DhanService`) and configuration check (`isDhanConfigured`) are in place.
- Exact request HTTP endpoints, query parameters, header keys, and response parsing logic will be finalized once live production API responses or documentation details are verified.
