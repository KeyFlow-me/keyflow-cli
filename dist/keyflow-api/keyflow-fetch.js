// Owner: every request the CLI sends to a KeyFlow server. Allowed imports: none.
// Callers: device auth, CLI config, guide, image slots, draft upload. Check: server-pinning.test.mjs.
/**
 * Fetch `path` on exactly `origin`. Redirects are refused so a bearer credential or ID token
 * can never follow a response to another host.
 */
export function keyflowFetch(origin, path, init = {}, fetchImpl = fetch) {
    if (!path.startsWith('/'))
        throw new Error(`KeyFlow API path must start with "/": ${path}`);
    const url = new URL(path, origin);
    if (url.origin !== origin)
        throw new Error('KeyFlow API request left the pinned server.');
    return fetchImpl(url.toString(), { ...init, redirect: 'error' });
}
