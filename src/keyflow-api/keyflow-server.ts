import type { CLIConfig } from '../lib/config.js';

// Owner: which KeyFlow origin may receive credentials. Allowed imports: config type only.
// Callers: login, push, guide, getIdToken. Check: server-pinning.test.mjs.
const DEFAULT_ORIGIN = 'https://www.keyflow.me';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

type ParseOptions = { allowInsecureLocalhost?: boolean };

/** Return the origin of `input`, or throw when it is not a server the CLI may send credentials to. */
function parse(input: string, options: ParseOptions = {}): string {
  let url: URL;
  try { url = new URL(input); }
  catch { throw new Error(`Invalid KeyFlow server URL: ${input}`); }
  if (url.username || url.password) throw new Error('The KeyFlow server URL must not contain credentials.');
  if (url.protocol === 'https:') return url.origin;
  if (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)) {
    if (options.allowInsecureLocalhost) return url.origin;
    throw new Error('Plain http is only allowed for a local server with --allow-insecure-localhost.');
  }
  throw new Error('The KeyFlow server must use https.');
}

export const KeyflowServer = {
  DEFAULT_ORIGIN,
  parse,
  /**
   * The only origin this account's credentials may be sent to. The server is fixed at login;
   * accounts saved before it was recorded, and credentials from environment variables,
   * belong to the default server.
   */
  of(config: CLIConfig | null | undefined): string {
    if (!config?.baseUrl) return DEFAULT_ORIGIN;
    // A stored http origin can only have come from an explicit --allow-insecure-localhost login.
    return parse(config.baseUrl, { allowInsecureLocalhost: true });
  },
} as const;
