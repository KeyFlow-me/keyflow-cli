import { createDeviceIdToken } from '../auth/device-auth.js';
/** Exchange the saved local session for a short-lived Firebase ID token. */
export async function getIdToken(baseUrl, config, log) {
    if (config.deviceCredential) {
        return (await createDeviceIdToken({ baseUrl, deviceCredential: config.deviceCredential })).idToken;
    }
    return createLegacyRefreshIdToken(baseUrl, config.refreshToken, log);
}
async function createLegacyRefreshIdToken(baseUrl, refreshToken, log) {
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
            refresh_token: refreshToken,
        }).toString(),
    });
    const refreshData = await refreshRes.json().catch(() => ({}));
    if (!refreshData.id_token) {
        throw new Error('Session expired. Please run "keyflow login" again.');
    }
    return refreshData.id_token;
}
