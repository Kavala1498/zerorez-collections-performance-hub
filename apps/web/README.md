# `@zerorez/web`

React 19 + Vite frontend for Zerorez Collections Performance Hub (Phase 5).

## Scripts

```bash
pnpm --filter @zerorez/web dev      # http://localhost:5173 (proxies /api → :3001)
pnpm --filter @zerorez/web build
pnpm --filter @zerorez/web typecheck
```

## Routes

| Path | Page |
|------|------|
| `/` | Dashboard (KPIs, stages, bases table, insights) |
| `/bases/:id` | Base analytics |
| `/cargar` | Excel upload + upload history |

UI is English (matches `reference/zerorez-crm.html` wording). Theme: light / dark (toggle + `prefers-color-scheme`). Design tokens match `arquitectura` §7.

Optional: set `VITE_API_BASE_URL` if the API is not proxied (default uses Vite proxy to `http://localhost:3001`).
