import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleDeleteLatest, handleGetLatest } from '../_lib/handlers.js';
import { applyCors, pinFromNodeRequest } from '../_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res as unknown as import('node:http').ServerResponse, req.headers.origin);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const result = await handleGetLatest();
      res.status(result.status).json(result.body);
      return;
    }

    if (req.method === 'DELETE') {
      const result = await handleDeleteLatest({
        pin: pinFromNodeRequest(req as unknown as import('node:http').IncomingMessage),
      });
      if (result.status === 204) {
        res.status(204).end();
        return;
      }
      res.status(result.status).json(result.body);
      return;
    }

    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET or DELETE' } });
  } catch (err) {
    console.error('[api/snapshots/latest]', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: err instanceof Error ? err.message : 'Internal error',
      },
    });
  }
}
