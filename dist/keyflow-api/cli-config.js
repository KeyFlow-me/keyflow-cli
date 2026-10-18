const requests = new Map();
/**
 * `GET /api/cli/config` once per server and process. Token exchange and the scheduling
 * check share the same public response, so one push never asks for it twice.
 */
export function fetchCliConfig(baseUrl) {
    const origin = new URL(baseUrl).origin;
    let request = requests.get(origin);
    if (!request) {
        request = load(baseUrl);
        requests.set(origin, request);
        // Only a confirmed answer is reused; a failure is retried by the next caller.
        request.then((result) => { if (!result.ok)
            requests.delete(origin); }, () => requests.delete(origin));
    }
    return request;
}
async function load(baseUrl) {
    const response = await fetch(`${baseUrl}/api/cli/config`);
    const body = await response.json().catch(() => null);
    return {
        ok: response.ok,
        status: response.status,
        apiKey: typeof body?.apiKey === 'string' && body.apiKey ? body.apiKey : undefined,
        scheduledPublishing: body?.capabilities?.scheduledPublishing === true,
    };
}
