# Zerorez Collections Performance Hub

Internal AR collections CRM for Zerorez: upload accounts-receivable Excel files, view a portfolio dashboard and per-base analytics, and generate automated insights. Persistence is Google Sheets.

## Monorepo layout

```
apps/web          React + Vite frontend
apps/api          Express + TypeScript API
packages/shared   Shared types, stage windows, status normalization, insights
reference/        Visual MVP HTML (read-only design reference)
```

Managed with **pnpm workspaces**. Shared business logic lives in `@zerorez/shared`.

## Phases

1. Scaffold + `@zerorez/shared`
2. Excel workbook parser (`exceljs`)
3. Sheets repository + upload API
4. Analytics endpoints
5. Frontend
6. **Auth + deploy** (current)

## Scripts

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck

# API with in-memory store (no Google credentials)
REPOSITORY=memory AUTH_DISABLED=true pnpm --filter @zerorez/api dev

# Web app (proxies /api → http://localhost:3001)
VITE_AUTH_DISABLED=true pnpm --filter @zerorez/web dev

# Create Sheets tabs/headers (requires service account env — see below)
pnpm --filter @zerorez/api setup-sheets
```

Copy `.env.example` to `.env` and fill in values. Never commit real credentials or customer Excel files.

---

## Google Cloud + Sheets setup

1. **Create a Google Cloud project** (or reuse one) and enable **Google Sheets API**.
2. **Service account** (server → Sheets):
   - IAM → Service Accounts → Create.
   - Create a JSON key; copy `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL` and the private key → `GOOGLE_PRIVATE_KEY` (keep `\n` escapes in `.env`).
   - Create a Google Spreadsheet; share it with the service account email as **Editor**.
   - Set `GOOGLE_SHEETS_SPREADSHEET_ID` to the spreadsheet ID from the URL.
3. **Bootstrap tabs**: run `pnpm --filter @zerorez/api setup-sheets` to create `accounts`, `bases`, `uploads`, `snapshots`, and `settings` headers.
4. **OAuth Web client** (browser sign-in):
   - APIs & Services → Credentials → Create **OAuth client ID** (application type: **Web**).
   - Authorized JavaScript origins: local `http://localhost:5173` plus your Vercel/Netlify URL.
   - Authorized redirect URIs are not required for Google Identity Services ID tokens.
   - Set the same client ID on API (`GOOGLE_OAUTH_CLIENT_ID`) and web (`VITE_GOOGLE_OAUTH_CLIENT_ID`).
5. **Domain restriction**: set `AUTH_ALLOWED_DOMAIN` to your company domain (e.g. `zerorez.com`). Only verified Google accounts on that domain can call protected APIs.
6. **Admin allowlist**: set `AUTH_ADMIN_EMAILS` to a comma-separated list of emails that may `POST /api/uploads`. Everyone else is a **viewer** (read-only). The values in `.env.example` are placeholders.

### Roles

| Role   | Access                                      |
|--------|---------------------------------------------|
| admin  | Dashboard + upload Excel                    |
| viewer | Dashboard / bases / history (read-only)     |

`GET /api/health` stays public for load balancers. All other `/api/*` routes require `Authorization: Bearer <Google ID token>` unless `AUTH_DISABLED=true` (local/tests).

### Security defaults

- **helmet** HTTP headers
- **CORS** restricted to `CORS_ORIGIN` (comma-separated)
- **Rate limits**: 300 req / 15 min general; 30 / 15 min on `/api/uploads`
- **Upload**: 10 MB max, `.xlsx` only
- Central error shape: `{ error: { code, message, details? } }`
- Service account credentials only via env — never in the repo

---

## Deploy notes

### Frontend (Vercel or Netlify)

1. Build command: `pnpm install && pnpm --filter @zerorez/shared build && pnpm --filter @zerorez/web build`
2. Publish directory: `apps/web/dist`
3. Env:
   - `VITE_API_BASE_URL` = public API URL (e.g. `https://zerorez-api.onrender.com`)
   - `VITE_GOOGLE_OAUTH_CLIENT_ID` = OAuth Web client ID
   - Leave `VITE_AUTH_DISABLED` unset/false in production
4. Add the production origin to the Google OAuth client’s authorized JavaScript origins.
5. Point `CORS_ORIGIN` on the API at the frontend origin(s).

### API (Render, Railway, or Cloud Run)

**Docker** (recommended for Cloud Run / any container host), from repo root:

```bash
docker build -f apps/api/Dockerfile -t zerorez-api .
docker run --env-file .env -p 3001:3001 zerorez-api
```

**Render / Railway** (Node without Docker):

- Root directory: repository root
- Build: `pnpm install && pnpm --filter @zerorez/shared build && pnpm --filter @zerorez/api build`
- Start: `pnpm --filter @zerorez/api start` (or `node apps/api/dist/index.js`)
- Set `PORT` as provided by the host; set `REPOSITORY=sheets` and all Google / auth env vars from `.env.example`
- Health check path: `/api/health`

**Cloud Run**:

```bash
gcloud run deploy zerorez-api \
  --source . \
  --dockerfile apps/api/Dockerfile \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,REPOSITORY=sheets,CORS_ORIGIN=https://your-front.vercel.app,AUTH_ALLOWED_DOMAIN=zerorez.com,..."
```

Prefer Secret Manager / platform secrets for `GOOGLE_PRIVATE_KEY` and similar. The container listens on `PORT` (default `3001`).

---

## License

Private / internal use.
