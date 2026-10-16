import crypto from 'crypto';
export const createDeviceAuthRequest = () => {
    const state = crypto.randomUUID();
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { state, codeVerifier, codeChallenge };
};
async function fetchFirebaseConfig(baseUrl) {
    const configRes = await fetch(`${baseUrl}/api/cli/config`);
    if (!configRes.ok) {
        throw new Error('Failed to retrieve KeyFlow platform configuration');
    }
    const { apiKey } = await configRes.json();
    if (!apiKey) {
        throw new Error('KeyFlow platform configuration is missing apiKey');
    }
    return { apiKey: apiKey };
}
async function signInWithCustomToken(baseUrl, customToken) {
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
    // Custom-token sign-in does not guarantee localId/email in its response.
    // Resolve identity from the ID token through Firebase before saving or uploading.
    const userRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: tokenData.idToken }),
    });
    const userData = await userRes.json().catch(() => ({}));
    const user = userData.users?.[0];
    if (!userRes.ok || typeof user?.localId !== 'string' || !user.localId || user.disabled) {
        throw new Error('Failed to verify CLI account identity');
    }
    return {
        idToken: tokenData.idToken,
        email: (user.email || ''),
        uid: user.localId,
    };
}
export const createDeviceIdToken = async ({ baseUrl, deviceCredential, }) => {
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
    const session = await signInWithCustomToken(baseUrl, sessionData.customToken);
    return {
        ...session,
        username: typeof sessionData.username === 'string' ? sessionData.username : undefined,
    };
};
export const exchangeDeviceCodeForSession = async ({ baseUrl, code, codeVerifier, }) => {
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
        deviceCredential: exchangeData.deviceCredential,
    });
    return {
        deviceCredential: exchangeData.deviceCredential,
        tokenType: (exchangeData.tokenType || 'keyflow_device_v1'),
        email: session.email,
        uid: session.uid,
        username: session.username,
    };
};
