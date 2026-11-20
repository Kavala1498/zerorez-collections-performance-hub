# `@zerorez/api`

Express + TypeScript API for Zerorez Collections Performance Hub.

## Phase 3

Google Sheets repository, Excel upload pipeline, and health/uploads endpoints.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/uploads` | multipart `.xlsx` + `cutoffDate` + `stageMode` |
| `GET` | `/api/uploads` | upload history |
| `GET` | `/api/health` | API + Sheets/memory health |

```bash
# In-memory (no Google credentials)
REPOSITORY=memory pnpm --filter @zerorez/api dev

# Bootstrap Sheets tabs (needs service-account env)
pnpm --filter @zerorez/api setup-sheets

pnpm --filter @zerorez/api test
```

See root `.env.example` for Sheets variables. Tests use `InMemoryAccountsRepository` only — no real credentials or customer Excel files.
