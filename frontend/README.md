# OI Intelligence — Frontend

The dashboard UI for **Billionit Wealth / Derivatives OI Intelligence**. A Vite + React +
TypeScript single-page app styled with Tailwind CSS (dark glassmorphism theme).

- **Live:** https://oi.billionitwealth.in (Vercel)
- **Backend API:** consumed via `VITE_API_BASE_URL`

## Stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Styling | Tailwind CSS (dark glassmorphism, `Plus Jakarta Sans`) |
| Hosting | Vercel (SPA) |

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # tsc -b && vite build → dist/
npm run preview  # serve the production build locally
```

## Configuration

Set the backend URL for the environment (include the full `https://` scheme — a missing
scheme makes the app call itself and fail):

```
# frontend/.env (or Vercel project env)
VITE_API_BASE_URL=https://<your-backend-host>
```

`src/config/api.ts` reads `VITE_API_BASE_URL` first and falls back to relative `/api`
paths when it is empty (e.g. when the frontend and backend share a domain).

## Deploying on Vercel

1. Import the repository, set the project root to `frontend/`.
2. Add `VITE_API_BASE_URL` pointing at the deployed backend.
3. `vercel.json` already rewrites all routes to `index.html` for SPA routing.
4. Attach the custom domain `oi.billionitwealth.in`.

Every push to `main` deploys automatically.
