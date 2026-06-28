import { PACKAGE_NAME } from './package-info.js';
const NPM_REGISTRY_LATEST_URL = `https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}/latest`;
export async function fetchLatestVersion() {
    const response = await fetch(NPM_REGISTRY_LATEST_URL, {
        headers: {
            Accept: 'application/json',
        },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.version !== 'string' || !data.version.trim()) {
        throw new Error(`Failed to check npm registry for ${PACKAGE_NAME}.`);
    }
    return data.version;
}
