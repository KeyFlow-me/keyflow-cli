import { keyflowFetch } from './keyflow-fetch.js';

export type CliConfigResult = {
  ok: boolean;
  status: number;
  apiKey?: string;
  scheduledPublishing: boolean;
};

const requests = new Map<string, Promise<CliConfigResult>>();

/**
 * `GET /api/cli/config` once per server and process. Token exchange and the scheduling
 * check share the same public response, so one push never asks for it twice.
 */
export function fetchCliConfig(baseUrl: string): Promise<CliConfigResult> {
  const origin = new URL(baseUrl).origin;
  let request = requests.get(origin);
  if (!request) {
    request = load(baseUrl);
    requests.set(origin, request);
    // Only a confirmed answer is reused; a failure is retried by the next caller.
    request.then((result) => { if (!result.ok) requests.delete(origin); }, () => requests.delete(origin));
  }
  return request;
}

async function load(baseUrl: string): Promise<CliConfigResult> {
  const response = await keyflowFetch(new URL(baseUrl).origin, '/api/cli/config');
  const body = await response.json().catch(() => null) as { apiKey?: unknown; capabilities?: { scheduledPublishing?: unknown } } | null;
  return {
    ok: response.ok,
    status: response.status,
    apiKey: typeof body?.apiKey === 'string' && body.apiKey ? body.apiKey : undefined,
    scheduledPublishing: body?.capabilities?.scheduledPublishing === true,
  };
}
