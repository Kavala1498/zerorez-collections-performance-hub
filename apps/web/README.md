# `@zerorez/web`

React + Vite UI for Zerorez Collections Performance Hub (English, light/dark).

Upload a collections `.xlsx` in the browser. Parsing and stage/KPI math run locally via `@zerorez/shared`; the processed snapshot is posted to `/api/snapshots` so all viewers share the same data. IndexedDB is an optional cache only.

```bash
pnpm install
pnpm --filter @zerorez/shared build
pnpm api:dev   # terminal 1 — memory store unless DATABASE_URL is set
pnpm --filter @zerorez/web dev   # terminal 2 — proxies /api → :3001
```

Open http://localhost:5173 → **Upload data** → choose `.xlsx`, cutoff date, stage mode, and PIN if configured.

Optional build env: `VITE_API_BASE_URL` (leave empty for same-origin `/api`).

Production build: `pnpm --filter @zerorez/web build` → publish `apps/web/dist` (with Vercel `api/` functions).
