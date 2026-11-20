# `@zerorez/api`

Express + TypeScript API for Zerorez Collections Performance Hub.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/uploads` | multipart `.xlsx` + `cutoffDate` + `stageMode` |
| `GET` | `/api/uploads` | upload history |
| `GET` | `/api/health` | API + Sheets/memory health |
| `GET` | `/api/dashboard?segment=all\|C\|R` | portfolio KPIs, stages, bases, insights |
| `GET` | `/api/bases?segment=` | 14 bases + severity colors |
| `GET` | `/api/bases/:id/analytics?segment=` | base KPIs, ranking, insights |
| `GET` | `/api/bases/:id/accounts?segment=` | open accounts for a base |
| `GET` | `/api/trends?segment=` | snapshot evolution |

`segment` defaults to `all`. Errors use `{ error: { code, message, details? } }`.

```bash
# In-memory (no Google credentials)
REPOSITORY=memory pnpm --filter @zerorez/api dev

# Bootstrap Sheets tabs (needs service-account env)
pnpm --filter @zerorez/api setup-sheets

pnpm --filter @zerorez/api test
```

See root `.env.example` for Sheets variables. Tests use `InMemoryAccountsRepository` only — no real credentials or customer Excel files.
