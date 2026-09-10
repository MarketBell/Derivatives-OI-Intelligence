# OI Intelligence Dashboard

A real-time Option Interest (OI) & OI Change analysis dashboard built for **Billionit Wealth / Derivatives OI Intelligence**.

## Overview

The system processes option chain data to provide actionable analytical insights across key equity indices:

- **NIFTY**
- **BANK NIFTY**
- **SENSEX**

## System Architecture Flow

```text
Dhan Option Chain API (Pending) ──► Normalization & Validation (Implemented)
                                          │
                                          ▼
                             MongoDB Persistence (Active)
                                          │
                                          ▼
                           OI Calculation Engine (Implemented)
                                          │
                                          ▼
                            Express REST API (Completed)
                                          │
                                          ▼
                       React Dashboard UI (Mock Data Active)
```

## Project Structure

```text
OI-INTELLIGENCE-DASHBOARD/
├── frontend/        # React + TypeScript + Vite + Tailwind CSS frontend dashboard
├── backend/         # Node.js + Express + TypeScript backend server
│   ├── src/
│   │   ├── config/       # Server configuration (DB, Dhan API)
│   │   ├── controllers/  # Option chain & health controllers
│   │   ├── middleware/   # Auth & error handling middleware
│   │   ├── models/       # Mongoose data schemas (Snapshot models)
│   │   ├── routes/       # API route definitions
│   │   ├── services/     # Pure OI Calculation, Normalization, Dhan service
│   │   ├── types/        # Option chain & system TypeScript types
│   │   ├── utils/        # Logger & utility helpers
│   │   └── validation/   # Runtime Zod schemas
│   └── __tests__/        # Jest unit test suites
├── database/        # Database schemas & documentation
├── docs/            # Project documentation, requirements, API & database specs
├── package.json     # Root project configuration & scripts
└── README.md        # Project overview & status
```

## Quick Start Commands

- **Run Both (Frontend + Backend concurrently)**: `npm run dev`
- **Run Frontend only**: `npm run dev:frontend`
- **Run Backend only**: `npm run dev:backend`
- **Run Backend Unit Tests**: `npm test`
- **Build Full Project**: `npm run build`

## Current Development Status Summary

- **Frontend UI**: Completed React/TypeScript dashboard UI (Dark theme, Index filter, Date/Time range filters, OI Summary Cards, OI & OI Change tables, positive/negative indicators). Currently powered by mock data. Located in `frontend/`.
- **Backend Foundation**: Node.js + Express + TypeScript structure fully operational (`GET /health`, `GET /api/option-chain`, centralized error handling). Located in `backend/`. `npm run build:backend` compiles cleanly with 0 errors.
- **OI Calculation Engine**: Fully implemented in `backend/src/services/oiCalculationService.ts` and independently verified with unit tests (Full-day, 1-hour, 15-minute, custom duration, percentage change, and zero/edge-case handling).
- **Testing**: 31 out of 31 backend unit tests passing cleanly (`npm test`).
- **Pending Implementations**: Real Dhan API live connection/authentication, MongoDB database connection & snapshot persistence, 5-minute automated scheduler, and connecting live backend data to the frontend UI.

For detailed status breakdown, see [docs/DEVELOPMENT_STATUS.md](docs/DEVELOPMENT_STATUS.md).
