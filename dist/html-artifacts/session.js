import { IdTokenCache } from '../account/id-token-cache.js';
import { fetchCliConfig } from '../keyflow-api/cli-config.js';
import { getIdToken } from '../keyflow-api/get-id-token.js';
import { keyflowFetch } from '../keyflow-api/keyflow-fetch.js';
import { KeyflowError } from '../keyflow-api/keyflow-error.js';
import { KeyflowServer } from '../keyflow-api/keyflow-server.js';
import { loadConfig } from '../lib/config.js';
/** Select one pinned account, confirm capability, then authenticate only that account. */
export async function createHtmlSession(account) {
    let config;
    try {
        config = loadConfig(account);
    }
    catch {
        throw new KeyflowError('Could not select the saved account. Run "keyflow account list".', 400, 'account-selection-failed');
    }
    if (!config || (!config.deviceCredential && !config.refreshToken)) {
        throw new KeyflowError('Not logged in. Run "keyflow login" first.', 401, 'not-logged-in');
    }
    const origin = KeyflowServer.of(config);
    const capability = await fetchCliConfig(origin);
    if (!capability.ok || !capability.htmlArtifacts) {
        throw new KeyflowError('This server does not confirm HTML support. Nothing was uploaded.', capability.status, 'html-not-supported', 'Update the KeyFlow server before using HTML commands.');
    }
    let token = await getIdToken(origin, config, () => { });
    async function send(path, init) {
        return keyflowFetch(origin, path, { ...init,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    }
    async function request(path, init = {}) {
        let response = await send(path, init);
        if (response.status === 401) {
            IdTokenCache.forget(origin, config);
            token = await getIdToken(origin, config, () => { }, { fresh: true });
            response = await send(path, init);
        }
        const body = await response.json().catch(() => null);
        if (!response.ok) {
            const code = typeof body?.code === 'string' && /^[a-z][a-z0-9_-]{0,80}$/.test(body.code) ? body.code : 'html-request-failed';
            throw new KeyflowError(response.status === 409 ? 'HTML changed on the server. Read the latest version before retrying.'
                : 'The server rejected the HTML request.', response.status, code);
        }
        if (!body || body.success !== true)
            throw new KeyflowError('The server did not confirm the HTML request.', 502, 'invalid-html-response');
        return body;
    }
    return { origin, uid: config.uid, account: config.accountName, request };
}
