# `@zerorez/api`

Express + TypeScript API for Zerorez Collections Performance Hub.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | public | API + Sheets/memory health |
| `GET` | `/api/me` | signed-in | Current user + role |
| `POST` | `/api/uploads` | **admin** | multipart `.xlsx` + `cutoffDate` + `stageMode` |
| `GET` | `/api/uploads` | signed-in | upload history |
| `GET` | `/api/dashboard?segment=all\|C\|R` | signed-in | portfolio KPIs, stages, bases, insights |
| `GET` | `/api/bases?segment=` | signed-in | 14 bases + severity colors |
| `GET` | `/api/bases/:id/analytics?segment=` | signed-in | base KPIs, ranking, insights |
| `GET` | `/api/bases/:id/accounts?segment=` | signed-in | open accounts for a base |
| `GET` | `/api/trends?segment=` | signed-in | snapshot evolution |

`segment` defaults to `all`. Errors use `{ error: { code, message, details? } }`.

Send `Authorization: Bearer <Google ID token>` when auth is enabled. Domain restriction and admin allowlist come from `AUTH_ALLOWED_DOMAIN` / `AUTH_ADMIN_EMAILS`.

```bash
# In-memory + auth bypass (local)
REPOSITORY=memory AUTH_DISABLED=true pnpm --filter @zerorez/api dev

# Bootstrap Sheets tabs (needs service-account env)
pnpm --filter @zerorez/api setup-sheets

pnpm --filter @zerorez/api test

# Container (from monorepo root)
docker build -f apps/api/Dockerfile -t zerorez-api .
```

See root `.env.example` and README for Sheets, OAuth, and deploy notes. Tests use `InMemoryAccountsRepository` and mock ID-token verification — no real credentials or customer Excel files.
