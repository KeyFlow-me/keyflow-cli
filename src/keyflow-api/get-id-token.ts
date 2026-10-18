import { IdTokenCache } from '../account/id-token-cache.js';
import { createDeviceIdToken } from '../auth/device-auth.js';
import type { CLIConfig } from '../lib/config.js';
import { fetchCliConfig } from './cli-config.js';

type IdTokenOptions = {
  /** Skip the cached token, e.g. after the server rejected it. */
  fresh?: boolean;
};

/**
 * Exchange the saved local session for a short-lived Firebase ID token.
 * A token from an earlier push is reused while it has more than five minutes left.
 */
export async function getIdToken(
  baseUrl: string,
  config: CLIConfig,
  log: (message: string) => void,
  options: IdTokenOptions = {},
): Promise<string> {
  if (config.baseUrl && new URL(config.baseUrl).origin !== new URL(baseUrl).origin) {
    throw new Error('The selected account belongs to another KeyFlow server. Use its original server or log in there.');
  }
  if (!options.fresh) {
    const cached = IdTokenCache.get(baseUrl, config);
    if (cached && (config.uid === 'env-uid' || cached.uid === config.uid)) return cached.idToken;
  }

  const session = config.deviceCredential
    ? await createDeviceIdToken({ baseUrl, deviceCredential: config.deviceCredential })
    : await createLegacyRefreshIdToken(baseUrl, config, log);
  if (config.uid !== 'env-uid' && session.uid !== config.uid) {
    throw new Error('The server identity does not match the selected account. Nothing was uploaded.');
  }
  if (session.expiresAt) {
    IdTokenCache.put(baseUrl, config, { idToken: session.idToken, uid: session.uid, expiresAt: session.expiresAt });
  }
  return session.idToken;
}

async function createLegacyRefreshIdToken(baseUrl: string, config: CLIConfig, log: (message: string) => void) {
  log('Using legacy refresh-token session. Run "keyflow login" to migrate this device.');
  const platform = await fetchCliConfig(baseUrl);
  if (!platform.ok) {
    throw new Error('Failed to retrieve KeyFlow platform configuration');
  }
  const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${platform.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken!,
    }).toString(),
  });

  const refreshData = await refreshRes.json().catch(() => ({}));
  if (!refreshData.id_token) {
    throw new Error('Session expired. Please run "keyflow login" again.');
  }
  const expiresInSeconds = Number(refreshData.expires_in);
  return {
    idToken: refreshData.id_token as string,
    uid: refreshData.user_id as string,
    expiresAt: Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? Date.now() + expiresInSeconds * 1000 : undefined,
  };
}
