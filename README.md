# Zerorez Collections Performance Hub

AR collections dashboard: upload an accounts-receivable Excel workbook in the browser, persist a **shared snapshot** (Postgres), and let every viewer see the same portfolio KPIs, sidebar totals, and charts for all 14 bases. **No Google Sheets, no Workspace OAuth.**

## Monorepo layout

```
apps/web          React + Vite frontend
api/              Vercel serverless routes (snapshots + health)
packages/shared   Types, stage windows, Excel parser, analytics, insights
migrations/       SQL for the snapshots table
reference/        Visual MVP HTML (read-only design reference)
```

Managed with **pnpm workspaces**. Shared business logic lives in `@zerorez/shared`.

## How it works

1. Open **Upload data**.
2. Choose a `.xlsx` with the 14 base tabs (BayArea, Dallas, Denver, Indianapolis, Jacksonville, Minnesota, Phoenix, Pittsburgh, Raleigh, SaltLakeCity, SoCal, Spokane, St.Louis, Tulsa).
3. Residential + Commercial tables are parsed in the browser (`exceljs` via `@zerorez/shared`).
4. Pick a **cutoff date**, stage mode, and (if configured) **Upload PIN**.
5. The processed snapshot (`accounts` + `cutoffDate` + `stageMode` + `uploadedAt` + filename/warnings + trend uploads) is `POST`ed to `/api/snapshots`.
6. On load, the app `GET`s `/api/snapshots/latest` and renders dashboard / sidebar / charts for all viewers. IndexedDB is an optional offline cache only — the API is the source of truth.

### Stage windows

| Stage | Days past due |
|-------|----------------|
| 1 | 0–14 |
| 2 | 15–29 |
| 3 | 30–48 |
| 4 | 49–63 |
| 5 | 64+ (Over 63 DPD) |

### API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/health` | public | Store mode + whether PIN is required |
| `GET` | `/api/snapshots/latest` | public | Latest shared portfolio snapshot |
| `POST` | `/api/snapshots` | `x-upload-pin` if `UPLOAD_PIN` set | Replace / append shared snapshot |
| `DELETE` | `/api/snapshots/latest` | `x-upload-pin` if `UPLOAD_PIN` set | Clear shared data |

When `DATABASE_URL` is unset, the API uses an in-memory store (fine for tests / local smoke). **Production needs Postgres.**

## Scripts

```bash
pnpm install
pnpm --filter @zerorez/shared build
pnpm test
pnpm typecheck

# API (memory store unless DATABASE_URL is set)
pnpm api:dev

# Web (proxies /api → http://localhost:3001)
pnpm --filter @zerorez/web dev
```

Open http://localhost:5173 → **Upload data**. Never commit real customer Excel files, `DATABASE_URL`, or `UPLOAD_PIN`.

### Synthetic fixture

```bash
pnpm --filter @zerorez/shared build
pnpm exec tsx scripts/verify-fixture.mjs
```

Writes `/tmp/zerorez-synthetic.xlsx`. Upload it at `/upload` with cutoff e.g. `2026-11-18`.

## Environment variables

| Variable | Where | Required | Notes |
|----------|-------|----------|-------|
| `DATABASE_URL` | Vercel / API | **Yes in prod** | Neon, Supabase, or Vercel Postgres URL |
| `UPLOAD_PIN` | Vercel / API | No | If set, upload/clear need header `x-upload-pin` |
| `CORS_ORIGIN` | API | No | Comma-separated; same-origin Vercel usually omit |
| `VITE_API_BASE_URL` | Web build | No | Leave empty for same-origin `/api` |

Copy `.env.example` → `.env` locally. Do **not** commit secrets.

## Postgres setup (Neon or Supabase — free tier)

### Neon

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string (`postgresql://…`).
3. In Vercel → Project → Settings → Environment Variables, set `DATABASE_URL` (Production + Preview).
4. Optionally set `UPLOAD_PIN` to a strong shared secret for uploaders.
5. Redeploy. The API runs `migrations/001_create_snapshots.sql` automatically on first request (`CREATE TABLE IF NOT EXISTS snapshots …`).

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Project Settings → Database → Connection string (URI), prefer the **pooler** URL for serverless.
3. Set `DATABASE_URL` (and optional `UPLOAD_PIN`) on Vercel, then redeploy.

No Google / Workspace credentials are used.

## Deploy (Vercel)

1. Framework: Other / Vite. Root directory: repository root.
2. Build / output come from `vercel.json`: builds `@zerorez/shared` + `@zerorez/web`, publishes `apps/web/dist`, and deploys `api/**/*.ts` serverless functions.
3. Set `DATABASE_URL` (+ optional `UPLOAD_PIN`) in the Vercel project env.
4. Redeploy after env changes: `vercel --prod` or push to the connected Git branch.

SPA routes rewrite to `/index.html` except `/api/*`.

### Redeploy notes (Alejandro)

1. Add free Neon or Supabase `DATABASE_URL` in Vercel env.
2. Set `UPLOAD_PIN` so only uploaders can replace the snapshot (viewers need no PIN).
3. Redeploy production.
4. Open the live URL in a private window → should load the latest snapshot (not “No data loaded”) after one successful upload from a PIN holder.
5. Confirm `/api/health` returns `{ ok: true, store: "postgres", uploadPinRequired: true }`.

## Privacy

- Do not commit credentials, service-account JSON, or real Excel exports.
- UI copy is English; light and dark themes are supported.
- Optional `UPLOAD_PIN` gates writes; reads stay public for shared-link viewers.

## License

Private / internal use.
