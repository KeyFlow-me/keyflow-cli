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
    if (context.account && session.username?.toLowerCase() !== context.account.toLowerCase()) {
        throw new Error('The approved username did not match the requested account. Update the KeyFlow server or sign in to the requested account; the existing local session was preserved.');
    }
    saveConfig({
        deviceCredential: session.deviceCredential,
        tokenType: session.tokenType,
        email: session.email,
        uid: session.uid,
        username: session.username,
        baseUrl: new URL(context.baseUrl).origin,
        lastLogin: new Date().toISOString(),
    }, context.account);
    return session;
}
export const DeviceLoginSession = {
    complete: completeDeviceLogin,
};
