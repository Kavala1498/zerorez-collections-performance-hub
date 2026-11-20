# Zerorez Collections Performance Hub

Standalone AR collections dashboard: upload an accounts-receivable Excel workbook in the browser, view portfolio and per-base analytics, and generate automated insights. **No Google Sheets, no OAuth, no backend.**

## Monorepo layout

```
apps/web          React + Vite frontend (the product)
packages/shared   Types, stage windows, Excel parser, analytics, insights
reference/        Visual MVP HTML (read-only design reference)
```

Managed with **pnpm workspaces**. Shared business logic lives in `@zerorez/shared`.

## How it works

1. Open **Upload data**.
2. Choose a `.xlsx` with the 14 base tabs (BayArea, Dallas, Denver, Indianapolis, Jacksonville, Minnesota, Phoenix, Pittsburgh, Raleigh, SaltLakeCity, SoCal, Spokane, St.Louis, Tulsa).
3. Residential + Commercial tables are parsed in the browser (`exceljs` via `@zerorez/shared`).
4. Pick a **cutoff date** and how to calculate stage (**by service date** or **Aging bucket** column).
5. Processed accounts, uploads, and snapshots persist in **IndexedDB** (localStorage fallback).
6. Dashboard, sidebar base totals, KPIs, charts, and insights refresh immediately.

### Stage windows

| Stage | Days past due |
|-------|----------------|
| 1 | 0–14 |
| 2 | 15–29 |
| 3 | 30–48 |
| 4 | 49–63 |
| 5 | 64+ (Over 63 DPD) |

## Scripts

```bash
pnpm install
pnpm --filter @zerorez/shared build
pnpm test
pnpm typecheck

# Local UI
pnpm --filter @zerorez/web dev
```

Open http://localhost:5173 → **Upload data**. Use a synthetic fixture (see below) or your own workbook. Never commit real customer Excel files or JSON credential keys.

### Synthetic fixture (local verify)

From the repo root, after `pnpm install`:

```bash
pnpm --filter @zerorez/shared build
pnpm exec tsx scripts/verify-fixture.mjs
```

This writes `/tmp/zerorez-synthetic.xlsx` and prints parse → KPI smoke output (Dallas / Phoenix / SaltLakeCity sample tabs). Then in the UI: **Upload data** → choose that file → set cutoff (e.g. `2026-11-18`) → **Upload file**. Dashboard and sidebar refresh from IndexedDB.

## Deploy (Vercel — static only)

1. Framework: Vite (or Other).
2. Build command: `pnpm install && pnpm --filter @zerorez/shared build && pnpm --filter @zerorez/web build`
3. Output directory: `apps/web/dist`
4. Root directory: repository root (or set install/build accordingly).
5. **No** environment variables required. Do **not** configure Google / Cloud Run / service accounts.

SPA fallback: rewrite all routes to `/index.html` (Vercel does this for Vite by default when `vercel.json` is present).

## Privacy

- All processing is local to the user’s browser.
- Do not commit credentials, service-account JSON, or real Excel exports.
- UI copy is English; light and dark themes are supported.

## License

Private / internal use.
