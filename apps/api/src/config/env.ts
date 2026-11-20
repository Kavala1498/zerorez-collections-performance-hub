import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
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
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(overrides: Partial<Record<keyof Env, string | number>> = {}): Env {
  if (cached && Object.keys(overrides).length === 0) return cached;
  const parsed = EnvSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  if (Object.keys(overrides).length === 0) {
    cached = parsed.data;
  }
  return parsed.data;
}

export function resetEnvCache(): void {
  cached = null;
}

export function expandPrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\\n/g, '\n');
}
