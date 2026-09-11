# OI Intelligence Dashboard - Current Development Status

**Document Last Updated**: 11 September 2026  
**Overall System Status**: Live in Production — deployed, database connected, live collection running

---

## Detailed Status by System Component

### 1. Backend Server Foundation & API Layer
- **Status**: **Completed & Fully Functional**
- **Tech Stack**: Node.js, Express, TypeScript, Zod, JWT, Mongoose
- **Architecture**: Clean 3-tier architecture with modular directory structure:
  - `backend/src/config/`: Database connection manager (`database.ts`), Upstox API configuration (`upstoxConfig.ts`), Dhan API configuration (`dhanConfig.ts`).
  - `backend/src/controllers/`: Express handlers (`authController.ts`, `optionChainController.ts`, `subscriptionController.ts`).
  - `backend/src/middleware/`: JWT authentication (`authenticateJWT`), Dashboard subscription guard (`requireDashboardAccess`), Admin RBAC (`requireAdmin`).
  - `backend/src/models/`: Mongoose data schemas (`OptionChainSnapshot.ts`, `User.ts`, `Subscription.ts`).
  - `backend/src/routes/`: API routes (`authRoutes.ts`, `optionChainRoutes.ts`, `subscriptionRoutes.ts`).
  - `backend/src/services/`: Calculation engine (`oiCalculationService.ts`), Data normalization (`normalizationService.ts`), In-memory ring buffer collector (`collectorService.ts`), DB persistence (`snapshotService.ts`), Auth & Subscriptions (`googleAuthService.ts`, `jwtService.ts`, `subscriptionService.ts`).
  - `backend/src/types/`: Centralized TypeScript definitions (`optionChain.ts`, `auth.ts`).
  - `backend/src/validation/`: Runtime Zod validation schemas (`optionChainValidation.ts`).
  - `backend/src/utils/`: Logger, error handler, Indian market hours utility (`marketHours.ts`).
- **Build Status**: `npm run build` compiles cleanly with **0 TypeScript errors**.

---

### 2. Market Data Ingestion & Collector Pipeline
- **Status**: **Completed & Tested**
- **Integrations**: Supports both **Upstox API v2** and **Dhan API v2**.
- **Automated Collector (`collectorService.ts`)**:
  - Polling intervals supported: `1 min`, `3 min` (default), `5 min`.
  - **Market Hours Guard**: Automatically checks active Indian market hours (`09:15 AM - 03:40 PM` IST, Mon–Fri). Supports manual override for off-hours testing (`bypassMarketHours`).
  - **Ring Buffer Storage**: Retains up to 200 recent snapshots in memory for instant high-speed API responses.
  - **MongoDB Ingestion**: Automatically upserts valid snapshots into MongoDB database when connected.

---

### 3. Option Chain Data Types & Normalization
- **Status**: **Completed**
- **File**: `backend/src/services/normalizationService.ts`, `backend/src/types/optionChain.ts`
- **Features**:
  - Enforces standard Indian index strike intervals (NIFTY ₹50, BANK NIFTY ₹100, SENSEX ₹100).
  - Filters out off-grid strike prices.
  - Normalizes raw Upstox and Dhan payload structures into standardized `NormalizedOptionChain` interfaces.

---

### 4. OI Calculation Engine
- **Status**: **Completed & Verified**
- **File**: `backend/src/services/oiCalculationService.ts`
- **Capabilities Implemented**:
  - **Dynamic ATM Determination**: Computes ATM strike based on live spot price and index strike step.
  - **ATM + 4 OTM Extraction**: Extracts 5 Call strikes and 5 Put strikes (9 unique strikes from ATM-4 to ATM+4).
  - **Delta Calculations**: Computes Call & Put OI changes against previous day closing baseline and session baselines.
  - **Resampling Engine**: Resamples snapshot series to target frequency (`1m`, `3m`, `5m`).
  - **Validation & Edge-case Protection**: Safe zero-division handling for PCR & percentage change; upfront validation ensuring start time is not later than end time.

---

### 5. Authentication, RBAC & Subscription Management
- **Status**: **Completed & Verified**
- **Features Implemented**:
  - **Root Administrator**: `billionitwealth@gmail.com` granted automatic admin privileges and free dashboard access.
  - **Email & Google OAuth**: Ingests user credentials, generates 30-day JWT Bearer tokens.
  - **Subscription Protection**: Enforces dashboard access controls based on paid ₹499 monthly subscription or admin free grant.
  - **Admin Actions**: List users, grant free access, activate paid subscription, revoke user access.

---

### 6. Automated Unit & Integration Testing
- **Status**: **100% Passing**
- **Test Framework**: Jest + ts-jest + Supertest
- **Results**: **81 out of 81 unit and integration tests passing cleanly**.
  - Tests covering calculation engine, strike interval rules, market hours guard, normalization, Zod runtime validation, rate limiters, auth middleware, and REST API endpoints.

---

### 7. Database Layer
- **Status**: **Active & Connected**
- **Target Database**: MongoDB Atlas (via Mongoose)
- **Indexing**: Indexed on `{ index: 1, timestamp: 1 }` (unique) and `{ index: 1, dateStr: 1, timestamp: 1 }`.
- **In-Memory Fallback**: Seamless operation even when MongoDB is offline via `collectorService` ring buffer.

---

### 8. Deployment (Live in Production)
- **Status**: **Deployed & Live**
- **Frontend**: Vite/React SPA deployed on **Vercel**, served at the custom domain **https://oi.billionitwealth.in**. SPA routing configured via `frontend/vercel.json`; API base URL supplied through `VITE_API_BASE_URL`.
- **Backend**: Deployed on **Railway** as a persistent Node.js service (a long-lived process is required so the 5-minute collector's scheduler keeps running — it cannot run on a serverless function).
- **Health**: `GET /health` reports `dbConnected: true` and the live broker as configured.
- **Website link**: The Billionit Wealth marketing site links to this dashboard from its "OI Intelligence" section and top navigation.
