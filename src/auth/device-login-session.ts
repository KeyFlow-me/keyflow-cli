import { saveConfig } from '../lib/config.js';
import { createDeviceAuthRequest, exchangeDeviceCodeForSession } from './device-auth.js';

type DeviceAuthRequest = ReturnType<typeof createDeviceAuthRequest>;

type AuthCallbackContext = {
  port: number;
  baseUrl: string;
  allowedOrigin: string;
  authRequest: DeviceAuthRequest;
};

async function completeDeviceLogin(body: string, context: AuthCallbackContext) {
  const data = JSON.parse(body) as { code?: unknown; state?: unknown };
  if (data.state !== context.authRequest.state) throw new Error('State mismatch');
  if (!data.code || typeof data.code !== 'string') throw new Error('No one-time login code received');

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
} as const;
