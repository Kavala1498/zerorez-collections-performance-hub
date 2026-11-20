# `@zerorez/web`

React + Vite UI for Zerorez Collections Performance Hub (English).

## Auth

- Google Identity Services ID token → `Authorization: Bearer …` on API calls.
- `VITE_GOOGLE_OAUTH_CLIENT_ID` must match API `GOOGLE_OAUTH_CLIENT_ID`.
- Local bypass: `VITE_AUTH_DISABLED=true` (pair with API `AUTH_DISABLED=true`).
- Admins see **Upload data**; viewers are read-only.

```bash
VITE_AUTH_DISABLED=true pnpm --filter @zerorez/web dev
pnpm --filter @zerorez/web build
```

Set `VITE_API_BASE_URL` in production to the deployed API origin.
