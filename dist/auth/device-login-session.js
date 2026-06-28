import { saveConfig } from '../lib/config.js';
import { exchangeDeviceCodeForSession } from './device-auth.js';
async function completeDeviceLogin(body, context) {
    const data = JSON.parse(body);
    if (data.state !== context.authRequest.state)
        throw new Error('State mismatch');
    if (!data.code || typeof data.code !== 'string')
        throw new Error('No one-time login code received');
    const session = await exchangeDeviceCodeForSession({
        baseUrl: context.baseUrl,
        code: data.code,
        codeVerifier: context.authRequest.codeVerifier,
    });
    saveConfig({
        deviceCredential: session.deviceCredential,
        tokenType: session.tokenType,
        email: session.email,
        uid: session.uid,
        lastLogin: new Date().toISOString(),
    });
    return session;
}
export const DeviceLoginSession = {
    complete: completeDeviceLogin,
};
