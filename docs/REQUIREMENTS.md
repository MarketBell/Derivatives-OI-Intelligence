# OI Intelligence Dashboard - Functional Requirements

## Core Requirements

1. **Purpose**:
   - Dashboard for option-chain based analysis.

2. **Supported Indices**:
   - **NIFTY**
   - **BANK NIFTY**
   - **SENSEX**

3. **Data Collection & Schedule**:
   - **Data Source**: Dhan Option Chain API
   - **Data Collection Window**: 9:15 AM to 3:40 PM (Trading Hours)
   - **Data Frequency**: Every 5 minutes

4. **Metrics & Indicators**:
   - **CE OI** (Call Option Open Interest)
   - **PE OI** (Put Option Open Interest)
   - **OI Change Calculations** (tracking interest build-up or unwinding over time intervals)

5. **Dashboard Features & Capabilities**:
   - **Selected Time-Duration Comparison**: Ability to evaluate OI changes over custom selected timeframes.
   - **Index Filtering**: Ability to filter analytics by specific index (NIFTY, BANK NIFTY, SENSEX).
   - **Visual Indicators**: Increase/decrease colour coding for quick visual identification of bullish/bearish positioning.

---

## Domain Definitions

- **OI (Open Interest)**: The total number of outstanding derivative contracts (option contracts) that have not been settled or closed out for an underlying asset.
- **OI Change**: The net difference in open interest between two timestamps (e.g., across 5-minute intervals), representing fresh position build-up or unwinding of existing positions.
- **CE (Call Option)**: A financial contract giving the buyer the right, but not the obligation, to buy an underlying asset at a specified strike price within a specified time frame.
- **PE (Put Option)**: A financial contract giving the buyer the right, but not the obligation, to sell an underlying asset at a specified strike price within a specified time frame.
