import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePostSnapshot } from '../_lib/handlers.js';
import { applyCors, pinFromNodeRequest } from '../_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res as unknown as import('node:http').ServerResponse, req.headers.origin);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } });
      return;
    }

    const result = await handlePostSnapshot({
      body: req.body,
      pin: pinFromNodeRequest(req as unknown as import('node:http').IncomingMessage),
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/snapshots]', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: err instanceof Error ? err.message : 'Internal error',
      },
    });
  }
}
