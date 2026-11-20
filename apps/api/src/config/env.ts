import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const optionalTruthy = (v: unknown): boolean | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'off'].includes(s)) return false;
  }
  return undefined;
};

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  /** Comma-separated allowed browser origins. */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** Use in-memory repository when "memory" (tests / local without Sheets). */
  REPOSITORY: z.enum(['sheets', 'memory']).default('sheets'),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  /** PEM private key; `\n` sequences are expanded. */
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  /** Optional path to a service-account JSON file. */
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  CACHE_TTL_MS: z.coerce.number().int().positive().default(60_000),

  /** Google OAuth Web client ID (ID token audience). */
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  /**
   * Company email domain required for sign-in (e.g. zerorez.com).
   * Empty string disables domain checks (not recommended in production).
   */
  AUTH_ALLOWED_DOMAIN: z.string().default('zerorez.com'),
  /**
   * Comma-separated admin emails (can upload). Everyone else is viewer.
   * Placeholder until the real allowlist is confirmed.
   */
  AUTH_ADMIN_EMAILS: z
    .string()
    .default('admin@zerorez.com,collections-admin@zerorez.com'),
  /**
   * When true, skip Google token verification and use AUTH_BYPASS_*.
   * Auto-enabled in NODE_ENV=test if unset.
   */
  AUTH_DISABLED: z.preprocess(optionalTruthy, z.boolean().optional()),
  AUTH_BYPASS_EMAIL: z.string().default('dev@zerorez.com'),
  AUTH_BYPASS_ROLE: z.enum(['admin', 'viewer']).default('admin'),
  AUTH_BYPASS_NAME: z.string().default('Local Dev'),
});

export type Env = z.infer<typeof EnvSchema> & {
  /** Effective auth-disabled flag (test defaults to true). */
  authDisabled: boolean;
};

let cached: Env | null = null;

export function getEnv(overrides: Partial<Record<string, string | number | boolean>> = {}): Env {
  if (cached && Object.keys(overrides).length === 0) return cached;
  const parsed = EnvSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  const data = parsed.data;
  const authDisabled =
    data.AUTH_DISABLED !== undefined
      ? data.AUTH_DISABLED
      : data.NODE_ENV === 'test';

  const env: Env = { ...data, authDisabled };
  if (Object.keys(overrides).length === 0) {
    cached = env;
  }
  return env;
}

export function resetEnvCache(): void {
  cached = null;
}

export function expandPrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\\n/g, '\n');
}
