# Database Schema - Initial Planning

> **IMPORTANT**: This document is for **INITIAL PLANNING ONLY**. Actual PostgreSQL database tables and migrations should NOT be created at this stage until the exact response payload structure of the Dhan Option Chain API has been fully mapped and verified.

## Preliminary Database Fields

The database schema will store periodic option chain snapshots to compute OI build-up and changes. The following preliminary fields have been identified:

| Field Name | Description | Example / Type |
| :--- | :--- | :--- |
| `Index` | Target index symbol | `NIFTY`, `BANKNIFTY`, `SENSEX` |
| `Timestamp` | Snapshot time of data collection (5-min interval) | `2026-08-17T09:15:00Z` |
| `Expiry` | Expiry date of the option contract | `2026-08-20` |
| `Strike Price` | Option strike price | `24500` |
| `CE OI` | Call Option Open Interest | Integer |
| `PE OI` | Put Option Open Interest | Integer |
| `CE OI Change` | Calculated or API-provided Call Option OI Change | Integer / Derived |
| `PE OI Change` | Calculated or API-provided Put Option OI Change | Integer / Derived |

---

## Next Steps

1. Inspect & document Dhan Option Chain API response payload structure.
2. Determine exact data types, index keys, and normalization rules.
3. Design and implement final PostgreSQL schema/migrations.
