# OI Intelligence Dashboard - Functional Requirements & Implementation Status

## Overview & Core Requirements

1. **Purpose**:
   - Comprehensive dashboard for real-time and historical option-chain Open Interest (OI) build-up and unwinding analysis.

2. **Supported Indices**:
   - **NIFTY**
   - **BANK NIFTY**
   - **SENSEX**

3. **Data Collection & Scheduling** *(Pending Integration)*:
   - **Data Source**: Dhan Option Chain API (POST `/v2/optionchain`)
   - **Data Collection Window**: 9:15 AM to 3:40 PM (Trading Hours)
   - **Data Frequency**: Every 5 minutes (Automated scheduler pending)

4. **Metrics & Indicators**:
   - **CE OI** (Call Option Open Interest)
   - **PE OI** (Put Option Open Interest)
   - **Full-Day OI Change** (Current/Closing OI - Previous Day Closing OI)
   - **Last 1-Hour OI Change** (Current OI - OI from 1 hour earlier)
   - **Last 15-Minute OI Change** (Current OI - OI from 15 minutes earlier)
   - **User-Selected Time Duration Difference** (OI at End Time - OI at Start Time)
   - **Percentage Change** (`((Current OI - Comparison OI) / Comparison OI) × 100`, handling comparison OI = 0 safely)

5. **Dashboard Features**:
   - Index selection (NIFTY, BANK NIFTY, SENSEX) - *Implemented in UI*
   - Date and Time-duration filters (Last 30 mins, Last 1 hour, custom start/end) - *Implemented in UI*
   - Summary cards (Total Call OI, Total Put OI, Net Difference) - *Implemented in UI*
   - OI & OI Change tables with color-coded positive/negative indicators - *Implemented in UI*
   - Dark theme dashboard layout - *Implemented in UI*

---

## Implementation Status of Requirements

| Requirement | Implementation Status | Verification |
| :--- | :--- | :--- |
| **Frontend UI Layout & Components** | **Completed** (Uses Mock Data) | Visually verified |
| **Option Chain Types & Schemas** | **Completed** (`backend/src/types/optionChain.ts`) | TypeScript build passed |
| **OI Calculation Engine** | **Completed** (`backend/src/services/oiCalculationService.ts`) | 21 unit tests passed |
| **Backend Foundation & Express API** | **Completed** (`GET /health`, basic option-chain routes) | 10 endpoint & unit tests passed |
| **Dhan API Integration** | **Structure Prepared** (`dhanService.ts`) | Pending live API credentials & payload mapping |
| **MongoDB Persistence** | **Model Defined** (`OptionChainSnapshot.ts`) | Pending active MongoDB connection & storage logic |
| **Automated 5-min Scheduler** | **Pending** | Not started |
| **Frontend Real Data Wiring** | **Pending** | Currently uses mock data |

---

## Domain Definitions

- **OI (Open Interest)**: The total number of outstanding derivative contracts (option contracts) that have not been settled or closed out for an underlying asset.
- **OI Change**: The net difference in open interest between two timestamps, representing fresh position build-up or unwinding of existing positions.
- **CE (Call Option)**: Option contract giving the buyer the right to buy the underlying asset.
- **PE (Put Option)**: Option contract giving the buyer the right to sell the underlying asset.
