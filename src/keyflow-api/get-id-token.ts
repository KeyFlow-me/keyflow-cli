import { createDeviceIdToken } from '../auth/device-auth.js';
import type { CLIConfig } from '../lib/config.js';

/** Exchange the saved local session for a short-lived Firebase ID token. */
export async function getIdToken(baseUrl: string, config: CLIConfig, log: (message: string) => void): Promise<string> {
  if (config.baseUrl && new URL(config.baseUrl).origin !== new URL(baseUrl).origin) {
    throw new Error('The selected account belongs to another KeyFlow server. Use its original server or log in there.');
  }
  if (config.deviceCredential) {
    const session = await createDeviceIdToken({ baseUrl, deviceCredential: config.deviceCredential });
    if (config.uid !== 'env-uid' && session.uid !== config.uid) {
      throw new Error('The server identity does not match the selected account. Nothing was uploaded.');
    }
    return session.idToken;
  }
  return createLegacyRefreshIdToken(baseUrl, config, log);
}

async function createLegacyRefreshIdToken(baseUrl: string, config: CLIConfig, log: (message: string) => void) {
  log('Using legacy refresh-token session. Run "keyflow login" to migrate this device.');
  const configRes = await fetch(`${baseUrl}/api/cli/config`);
  if (!configRes.ok) {
    throw new Error('Failed to retrieve KeyFlow platform configuration');
  }
  const { apiKey } = await configRes.json();
  const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
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
  if (config.uid !== 'env-uid' && refreshData.user_id !== config.uid) {
    throw new Error('The server identity does not match the selected account. Nothing was uploaded.');
  }
  return refreshData.id_token as string;
}
