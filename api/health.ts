import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readEnv } from './_lib/env.js';
import { applyCors } from './_lib/http.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res as unknown as import('node:http').ServerResponse, req.headers.origin);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  const env = readEnv();
  res.status(200).json({
    ok: true,
    store: env.databaseUrl ? 'postgres' : 'memory',
    uploadPinRequired: Boolean(env.uploadPin),
  });
}
