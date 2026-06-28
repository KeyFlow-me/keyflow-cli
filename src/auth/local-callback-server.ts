import http from 'http';
import { AUTH_REQUEST_TIMEOUT_MS } from './callback-body.js';
import { CallbackResponse } from './callback-response.js';
import { handleCallbackPost } from './callback-handler.js';

type AuthCallbackContext = Parameters<typeof handleCallbackPost>[3];

function requestPath(req: http.IncomingMessage, port: number) {
  try {
    return req.url ? new URL(req.url, `http://127.0.0.1:${port}`).pathname : '';
  } catch {
    return '';
  }
}

function applyCallbackCors(req: http.IncomingMessage, res: http.ServerResponse, allowedOrigin: string) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.headers.origin !== allowedOrigin) {
    CallbackResponse.json(res, 403, { success: false, error: 'origin_not_allowed' });
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Vary', 'Origin');
  return true;
}

export function createCallbackServer(context: AuthCallbackContext) {
  const server = http.createServer((req, res) => {
    if (!applyCallbackCors(req, res, context.allowedOrigin)) return;

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && requestPath(req, context.port) === '/callback') {
      void handleCallbackPost(req, res, server, context);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.requestTimeout = AUTH_REQUEST_TIMEOUT_MS;
  server.headersTimeout = AUTH_REQUEST_TIMEOUT_MS;
  server.timeout = AUTH_REQUEST_TIMEOUT_MS;
  return server;
}
