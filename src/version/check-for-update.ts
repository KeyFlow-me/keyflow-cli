import { compareVersions } from './compare-versions.js';
import { fetchLatestVersion } from './fetch-latest-version.js';

export async function checkForUpdate(currentVersion: string) {
  const latestVersion = await fetchLatestVersion();
  return {
    currentVersion,
    latestVersion,
    updateAvailable: currentVersion === 'unknown' ? false : compareVersions(currentVersion, latestVersion) < 0,
  };
}
