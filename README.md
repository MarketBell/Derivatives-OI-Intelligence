# OI Intelligence Dashboard

A real-time Option Interest (OI) & OI Change analysis dashboard built for **Billionit Wealth / Derivatives OI Intelligence**.

> **Status:** Live in production. Frontend at **https://oi.billionitwealth.in** (Vercel), backend on Railway, MongoDB Atlas connected, live broker option-chain collection running every 5 minutes.

## Overview

The system processes option chain data to provide actionable analytical insights across key equity indices:

- **NIFTY**
- **BANK NIFTY**
- **SENSEX**

## System Architecture Flow

```text
Broker Option Chain API (Upstox live / Dhan configured) ──► Normalization & Validation (Live)
                                          │
                                          ▼
                             MongoDB Atlas Persistence (Live)
                                          │
                                          ▼
                           OI Calculation Engine (Live)
                                          │
                                          ▼
                            Express REST API (Live)
                                          │
                                          ▼
                       React Dashboard UI (Live data, deployed)
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

- **Live deployment**: Frontend served at **https://oi.billionitwealth.in** (Vercel SPA); backend runs as a persistent Node.js service on Railway (the 5-minute collector needs a long-lived process, so it cannot be serverless).
- **Frontend UI**: React/TypeScript dashboard (dark glassmorphism theme, index filter, date/time-range filters, OI summary cards, OI & OI-change tables, positive/negative indicators) wired to live backend data. Located in `frontend/`.
- **Backend Foundation**: Node.js + Express + TypeScript fully operational (`GET /health`, `GET /api/option-chain`, auth + subscription routes, centralized error handling). Located in `backend/`. `npm run build:backend` compiles cleanly with 0 errors.
- **Data Collection**: Live broker option-chain polling every 5 minutes during Indian market hours (Upstox API v2 live; Dhan API v2 configured), normalized and persisted to MongoDB Atlas.
- **OI Calculation Engine**: Fully implemented in `backend/src/services/oiCalculationService.ts` and verified with unit tests (full-day, 1-hour, 15-minute, custom duration, percentage change, and zero/edge-case handling).
- **Database**: MongoDB Atlas connected and persisting snapshots, users, and subscriptions.
- **Auth & Access**: Email + Google login, JWT, root-admin RBAC, and subscription-gated dashboard access.
- **Testing**: 81 out of 81 backend unit and integration tests passing cleanly (`npm test`).

For a detailed status breakdown, see [docs/DEVELOPMENT_STATUS.md](docs/DEVELOPMENT_STATUS.md). For deployment specifics, see [DEPLOYMENT_READINESS.md](DEPLOYMENT_READINESS.md).
