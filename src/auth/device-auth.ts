import crypto from 'crypto';
import { fetchCliConfig } from '../keyflow-api/cli-config.js';
import { keyflowFetch } from '../keyflow-api/keyflow-fetch.js';

type DeviceCodeExchangeRequest = {
  baseUrl: string;
  code: string;
  codeVerifier: string;
};

type DeviceSessionRequest = {
  baseUrl: string;
  deviceCredential: string;
};

export const createDeviceAuthRequest = () => {
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { state, codeVerifier, codeChallenge };
};

async function fetchFirebaseConfig(baseUrl: string) {
  const config = await fetchCliConfig(baseUrl);
  if (!config.ok) {
    throw new Error('Failed to retrieve KeyFlow platform configuration');
  }
  if (!config.apiKey) {
    throw new Error('KeyFlow platform configuration is missing apiKey');
  }
  return { apiKey: config.apiKey };
}

/** Read the UID from a token Firebase just returned over TLS. */
function uidFromIdToken(idToken: string) {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8'));
    const uid = payload.user_id ?? payload.sub;
    return typeof uid === 'string' && uid ? uid : undefined;
  } catch {
    return undefined;
  }
}

async function signInWithCustomToken(baseUrl: string, customToken: string) {
  const { apiKey } = await fetchFirebaseConfig(baseUrl);
  const tokenRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    redirect: 'error',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: customToken,
      returnSecureToken: true,
    }),
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.idToken) {
    throw new Error(tokenData.error?.message || 'Failed to create CLI session');
  }

  // Custom-token sign-in does not return localId; the UID is the token's own claim.
  const uid = uidFromIdToken(tokenData.idToken);
  if (!uid) {
    throw new Error('Failed to verify CLI account identity');
  }
  const expiresInSeconds = Number(tokenData.expiresIn);
  return {
    apiKey,
    idToken: tokenData.idToken as string,
    uid,
    expiresAt: Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? Date.now() + expiresInSeconds * 1000 : undefined,
  };
}

/** Login only: fetch the email to save and confirm the account is enabled. */
async function lookupAccount(apiKey: string, idToken: string, uid: string) {
  const userRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    redirect: 'error',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const userData = await userRes.json().catch(() => ({}));
  const user = userData.users?.[0];
  if (!userRes.ok || user?.localId !== uid || user.disabled) {
    throw new Error('Failed to verify CLI account identity');
  }
  return { email: (user.email || '') as string };
}

export const createDeviceIdToken = async ({
  baseUrl,
  deviceCredential,
}: DeviceSessionRequest) => {
  const sessionRes = await keyflowFetch(baseUrl, '/api/auth/device/session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deviceCredential}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clientType: 'cli' }),
  });

  const sessionData = await sessionRes.json().catch(() => ({}));
  if (!sessionRes.ok || !sessionData.customToken) {
    throw new Error(sessionData.error || 'Failed to create CLI device session');
  }

  const session = await signInWithCustomToken(baseUrl, sessionData.customToken as string);
  return {
    ...session,
    username: typeof sessionData.username === 'string' ? sessionData.username : undefined,
  };
};

export const exchangeDeviceCodeForSession = async ({
  baseUrl,
  code,
  codeVerifier,
}: DeviceCodeExchangeRequest) => {
  const exchangeRes = await keyflowFetch(baseUrl, '/api/auth/device/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientType: 'cli',
      code,
      codeVerifier,
    }),
  });

  const exchangeData = await exchangeRes.json().catch(() => ({}));
  if (!exchangeRes.ok || !exchangeData.deviceCredential) {
    throw new Error(exchangeData.error || 'Failed to exchange one-time login code');
  }

  const session = await createDeviceIdToken({
    baseUrl,
    deviceCredential: exchangeData.deviceCredential as string,
  });
  const { email } = await lookupAccount(session.apiKey, session.idToken, session.uid);

  return {
    deviceCredential: exchangeData.deviceCredential as string,
    tokenType: (exchangeData.tokenType || 'keyflow_device_v1') as string,
    email,
    uid: session.uid,
    username: session.username,
  };
};
