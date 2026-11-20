export type ApiEnv = {
  databaseUrl: string | null;
  uploadPin: string | null;
  corsOrigin: string | null;
};

export function readEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const databaseUrl = source.DATABASE_URL?.trim() || null;
  const uploadPin = source.UPLOAD_PIN?.trim() || null;
  const corsOrigin = source.CORS_ORIGIN?.trim() || null;
  return { databaseUrl, uploadPin, corsOrigin };
}
