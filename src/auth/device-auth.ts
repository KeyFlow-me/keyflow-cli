import crypto from 'crypto';

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
  const configRes = await fetch(`${baseUrl}/api/cli/config`);
  if (!configRes.ok) {
    throw new Error('Failed to retrieve KeyFlow platform configuration');
  }

  const { apiKey } = await configRes.json();
  if (!apiKey) {
    throw new Error('KeyFlow platform configuration is missing apiKey');
  }
  return { apiKey: apiKey as string };
}

async function signInWithCustomToken(baseUrl: string, customToken: string) {
  const { apiKey } = await fetchFirebaseConfig(baseUrl);
  const tokenRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
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

  return {
    idToken: tokenData.idToken as string,
    email: (tokenData.email || '') as string,
    uid: (tokenData.localId || '') as string,
  };
}

export const createDeviceIdToken = async ({
  baseUrl,
  deviceCredential,
}: DeviceSessionRequest) => {
  const sessionRes = await fetch(`${baseUrl}/api/auth/device/session`, {
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

  return signInWithCustomToken(baseUrl, sessionData.customToken as string);
};

export const exchangeDeviceCodeForSession = async ({
  baseUrl,
  code,
  codeVerifier,
}: DeviceCodeExchangeRequest) => {
  const exchangeRes = await fetch(`${baseUrl}/api/auth/device/exchange`, {
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

  return {
    deviceCredential: exchangeData.deviceCredential as string,
    tokenType: (exchangeData.tokenType || 'keyflow_device_v1') as string,
    email: session.email,
    uid: session.uid,
  };
};
