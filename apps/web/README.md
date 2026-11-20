# `@zerorez/web`

Standalone React + Vite UI for Zerorez Collections Performance Hub (English, light/dark).

Upload a collections `.xlsx` in the browser. Parsing, stage/KPI math, and persistence all run locally (IndexedDB). No API, Google Sheets, or OAuth.

```bash
pnpm install
pnpm --filter @zerorez/shared build
pnpm --filter @zerorez/web dev
```

Open http://localhost:5173 → **Upload data** → choose `.xlsx`, cutoff date, and stage mode.

Production build: `pnpm --filter @zerorez/web build` → publish `apps/web/dist`.
