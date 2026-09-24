import { KeyflowError } from './keyflow-error.js';

/** Turn a non-OK `/api/cli/*` response into a `KeyflowError` with the server's code and hint. */
export async function readKeyflowError(response: Response, fallback: string): Promise<KeyflowError> {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown; message?: unknown; code?: unknown; hint?: unknown };
  const message = typeof body.error === 'string' ? body.error : typeof body.message === 'string' ? body.message : fallback;
  return new KeyflowError(
    message,
    response.status,
    typeof body.code === 'string' ? body.code : undefined,
    typeof body.hint === 'string' ? body.hint : undefined,
  );
}
