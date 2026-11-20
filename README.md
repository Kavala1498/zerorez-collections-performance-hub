# Zerorez Collections Performance Hub

Internal AR collections CRM for Zerorez: upload accounts-receivable Excel files, view a portfolio dashboard and per-base analytics, and generate automated insights. Persistence is Google Sheets.

## Monorepo layout

```
apps/web          React + Vite frontend (Phase 5)
apps/api          Express + TypeScript API (Phases 2–4)
packages/shared   Shared types, stage windows, status normalization, insights
reference/        Visual MVP HTML (read-only design reference)
```

Managed with **pnpm workspaces**. Shared business logic (bases, stages, `stageFromDays`, `normalizeStatus`, `buildInsights`) lives in `@zerorez/shared` so the API and web app stay consistent.

## Phases

1. Scaffold + `@zerorez/shared`
2. Excel workbook parser (`exceljs`)
3. Sheets repository + upload API
4. Analytics endpoints
5. **Frontend** (current)
6. Auth + deploy

## Scripts

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck

# API with in-memory store (no Google credentials)
REPOSITORY=memory pnpm --filter @zerorez/api dev

# Web app (proxies /api → http://localhost:3001)
pnpm --filter @zerorez/web dev

# Create Sheets tabs/headers (requires service account env — see .env.example)
pnpm --filter @zerorez/api setup-sheets
```

## License

Private / internal use.
