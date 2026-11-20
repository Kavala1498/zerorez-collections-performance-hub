# Zerorez Collections Performance Hub

Internal AR collections CRM for Zerorez: upload accounts-receivable Excel files, view a portfolio dashboard and per-base analytics, and generate automated insights. Persistence is Google Sheets (later phases).

## Monorepo layout

```
apps/web          React + Vite frontend (Phase 5)
apps/api          Express + TypeScript API (Phases 2–4)
packages/shared   Shared types, stage windows, status normalization, insights
reference/        Visual MVP HTML (read-only design reference)
```

Managed with **pnpm workspaces**. Shared business logic (bases, stages, `stageFromDays`, `normalizeStatus`, `buildInsights`) lives in `@zerorez/shared` so the API and web app stay consistent.

## Phase 1 (current)

Scaffolding, tooling (TypeScript strict, ESLint, Prettier, Vitest), and a complete `packages/shared` package with unit tests. Apps are placeholders until later phases.

## Scripts

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
```

## License

Private / internal use.
