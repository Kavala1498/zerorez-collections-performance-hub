/**
 * Local API server for Vite proxy (/api → :3001).
 * Run: pnpm api:dev
 */
import { createServer } from 'node:http';
import { readEnv } from '../api/_lib/env.js';
import {
  handleDeleteLatest,
  handleGetLatest,
  handlePostSnapshot,
} from '../api/_lib/handlers.js';
import { applyCors, pinFromNodeRequest, readJsonBody, sendJson } from '../api/_lib/http.js';

const port = Number(process.env.PORT || 3001);

const server = createServer(async (req, res) => {
  applyCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${port}`);
  const path = url.pathname.replace(/\/$/, '') || '/';

  try {
    if (path === '/api/health' && req.method === 'GET') {
      const env = readEnv();
      sendJson(res, {
        status: 200,
        body: {
          ok: true,
          store: env.databaseUrl ? 'postgres' : 'memory',
          uploadPinRequired: Boolean(env.uploadPin),
        },
      });
      return;
    }

    if (path === '/api/snapshots/latest' && req.method === 'GET') {
      sendJson(res, await handleGetLatest());
      return;
    }

    if (path === '/api/snapshots/latest' && req.method === 'DELETE') {
      sendJson(res, await handleDeleteLatest({ pin: pinFromNodeRequest(req) }));
      return;
    }

    if (path === '/api/snapshots' && req.method === 'POST') {
      const body = await readJsonBody(req);
      sendJson(res, await handlePostSnapshot({ body, pin: pinFromNodeRequest(req) }));
      return;
    }

    sendJson(res, {
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: `No route ${req.method} ${path}` } },
    });
  } catch (err) {
    console.error(err);
    sendJson(res, {
      status: 500,
      body: {
        error: {
          code: 'INTERNAL',
          message: err instanceof Error ? err.message : 'Internal error',
        },
      },
    });
  }
});

server.listen(port, () => {
  const env = readEnv();
  console.log(
    `[api] http://localhost:${port} · store=${env.databaseUrl ? 'postgres' : 'memory'} · pin=${env.uploadPin ? 'required' : 'open'}`,
  );
});
