import type { IncomingMessage, ServerResponse } from 'node:http';
import { readEnv } from './env.js';
import { readPinFromHeaders } from './pin.js';
import type { HandlerResult } from './handlers.js';

export function applyCors(res: ServerResponse, originHeader?: string | null): void {
  const { corsOrigin } = readEnv();
  const allowed = corsOrigin ?? '*';
  if (allowed === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    const list = allowed.split(',').map((s) => s.trim()).filter(Boolean);
    const origin = originHeader ?? '';
    if (list.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-upload-pin',
  );
}

export function sendJson(res: ServerResponse, result: HandlerResult): void {
  if (result.status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }
  const payload = JSON.stringify(result.body);
  res.writeHead(result.status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw) as unknown;
}

export function pinFromNodeRequest(req: IncomingMessage): string | null {
  return readPinFromHeaders(req.headers);
}
